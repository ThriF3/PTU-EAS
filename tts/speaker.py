"""
tts/speaker.py

Local voicebank-based TTS engine.
Replaces gTTS entirely. Uses pydub for audio concatenation and
pygame for local playback. Designed to be drop-in compatible with
the existing Flask /speak route.

Future expansion note:
    To support word-based voicebanks, extend _load_segment() to
    accept string keys and map them to filenames. The concatenation
    and playback logic stays identical.
"""

import os
import time
import tempfile
import threading

import pygame
from pydub import AudioSegment

from utils.logger import log


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Absolute path to the voicebank directory.
# Adjust if your folder structure differs.
VOICEBANK_DIR = os.path.join(os.path.dirname(__file__), "..", "voicebank")

# Temporary directory for stitched output files.
# Created automatically on first use.
TEMP_DIR = os.path.join(os.path.dirname(__file__), "..", "temp")

# Internal export format. WAV avoids MP3 re-encoding artifacts during
# concatenation and gives pydub better stitching precision.
INTERNAL_FORMAT = "wav"

# Pygame mixer settings — must match or exceed your MP3 source quality.
SAMPLE_RATE = 44100
CHANNELS = 2        # stereo
BIT_DEPTH = -16     # 16-bit signed

# ---------------------------------------------------------------------------
# One-time pygame initialisation (module level, lazy on first speak() call)
# ---------------------------------------------------------------------------
_pygame_ready = False
_pygame_lock = threading.Lock()


def _ensure_pygame() -> None:
    """Initialise pygame mixer exactly once, thread-safely."""
    global _pygame_ready
    if _pygame_ready:
        return
    with _pygame_lock:
        if not _pygame_ready:
            pygame.mixer.pre_init(
                frequency=SAMPLE_RATE,
                size=BIT_DEPTH,
                channels=CHANNELS,
                buffer=2048,
            )
            pygame.mixer.init()
            log("pygame mixer initialised.")
            _pygame_ready = True


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _ensure_temp_dir() -> None:
    """Create the temp directory if it doesn't exist."""
    os.makedirs(TEMP_DIR, exist_ok=True)


def _voicebank_path(digit: str) -> str:
    """Return the absolute path to a digit's MP3 clip."""
    return os.path.join(VOICEBANK_DIR, f"{digit}.mp3")


def _load_segment(digit: str) -> AudioSegment:
    """
    Load a single digit's audio clip from the voicebank.

    Args:
        digit: A single character '0'–'9'.

    Returns:
        A pydub AudioSegment for that digit.

    Raises:
        FileNotFoundError: If the MP3 clip is missing from the voicebank.
        ValueError:        If digit is not a valid single digit character.
    """
    if digit not in "0123456789" or len(digit) != 1:
        raise ValueError(f"Invalid digit key: '{digit}'")

    path = _voicebank_path(digit)
    if not os.path.isfile(path):
        raise FileNotFoundError(
            f"Voicebank clip missing: {path}\n"
            f"Expected: voicebank/{digit}.mp3"
        )

    log(f"Loading voicebank clip: {path}")
    return AudioSegment.from_mp3(path)


def _concatenate_digits(digits: str) -> AudioSegment:
    """
    Concatenate AudioSegments for each digit in sequence.

    Args:
        digits: String of digit characters, e.g. '1205'.

    Returns:
        A single pydub AudioSegment ready for export.
    """
    combined = AudioSegment.empty()
    for ch in digits:
        segment = _load_segment(ch)
        combined += segment
    return combined


def _export_to_temp(audio: AudioSegment) -> str:
    """
    Export a combined AudioSegment to a temporary WAV file.

    Returns:
        Absolute path to the temporary file.
    """
    _ensure_temp_dir()

    # Use a unique name so concurrent requests don't collide.
    tmp = tempfile.NamedTemporaryFile(
        suffix=f".{INTERNAL_FORMAT}",
        dir=TEMP_DIR,
        delete=False,
    )
    tmp.close()

    audio.export(tmp.name, format=INTERNAL_FORMAT)
    log(f"Exported combined audio to: {tmp.name}")
    return tmp.name


def _play_and_cleanup(filepath: str) -> None:
    """
    Play a WAV file via pygame and delete it afterwards.

    Blocks until playback finishes, then removes the temp file.
    Runs on a background thread to avoid blocking Flask's request thread.
    """
    try:
        _ensure_pygame()
        sound = pygame.mixer.Sound(filepath)
        channel = sound.play()

        # Poll until playback is done (avoids busy-wait CPU spike).
        while channel.get_busy():
            time.sleep(0.05)

        log(f"Playback finished: {filepath}")
    except Exception as exc:
        log(f"Playback error for {filepath}: {exc}", level="ERROR")
    finally:
        # Always clean up, even if playback failed.
        try:
            os.remove(filepath)
            log(f"Temp file deleted: {filepath}")
        except OSError as rm_err:
            log(f"Could not delete temp file {filepath}: {rm_err}", level="WARNING")


# ---------------------------------------------------------------------------
# Public API  — drop-in replacement for the old gTTS speak()
# ---------------------------------------------------------------------------

def speak(text: str) -> None:
    """
    Convert a digit string to speech using the local voicebank.

    Accepts ONLY digit characters ('0'–'9'). Raises ValueError for
    any other input. Playback runs on a daemon thread so the Flask
    route returns immediately without blocking.

    Args:
        text: A string of digit characters, e.g. '1205'.

    Raises:
        ValueError:        If text is empty or contains non-digit characters.
        FileNotFoundError: If any required voicebank MP3 is missing.
    """
    # --- Input validation ---
    if not text:
        raise ValueError("speak() received empty text.")

    stripped = text.strip()
    if not stripped:
        raise ValueError("speak() received blank/whitespace-only text.")

    if not stripped.isdigit():
        non_digits = [ch for ch in stripped if not ch.isdigit()]
        raise ValueError(
            f"speak() only accepts digit characters. "
            f"Non-digit chars found: {non_digits!r}"
        )

    log(f"speak() called with: '{stripped}'")

    # --- Build audio ---
    combined = _concatenate_digits(stripped)

    # --- Export to temp WAV ---
    tmp_path = _export_to_temp(combined)

    # --- Play on background thread (non-blocking for Flask) ---
    thread = threading.Thread(
        target=_play_and_cleanup,
        args=(tmp_path,),
        daemon=True,   # exits automatically when the main process exits
        name=f"tts-playback-{os.path.basename(tmp_path)}",
    )
    thread.start()
    log(f"Playback thread started: {thread.name}")