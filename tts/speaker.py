import os
import time
import tempfile
import threading

import torch
import soundfile as sf
import pygame
from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan

from config import TTS_MODEL_PATH, VOCODER_PATH, SPEAKER_EMBEDDING_PATH
from utils.logger import log

# ---------------------------------------------------------------------------
# Konfigurasi
# ---------------------------------------------------------------------------

SAMPLE_RATE = 16000
TEMP_DIR = os.path.join(os.path.dirname(__file__), "..", "temp")

# ---------------------------------------------------------------------------
# Pygame — inisialisasi sekali
# ---------------------------------------------------------------------------

_pygame_ready = False
_pygame_lock = threading.Lock()


def _ensure_pygame() -> None:
    global _pygame_ready
    if _pygame_ready:
        return
    with _pygame_lock:
        if not _pygame_ready:
            pygame.mixer.pre_init(frequency=SAMPLE_RATE, size=-16, channels=1, buffer=2048)
            pygame.mixer.init()
            log("pygame mixer initialised.")
            _pygame_ready = True


# ---------------------------------------------------------------------------
# Lazy loading model — load sekali saat pertama kali dipanggil
# ---------------------------------------------------------------------------

_processor = None
_model = None
_vocoder = None
_speaker_embedding = None


def _load_models() -> None:
    global _processor, _model, _vocoder, _speaker_embedding
    if _processor is not None:
        return

    log(f"Loading SpeechT5 processor dari: {TTS_MODEL_PATH}")
    _processor = SpeechT5Processor.from_pretrained(TTS_MODEL_PATH)

    log(f"Loading SpeechT5 model dari: {TTS_MODEL_PATH}")
    _model = SpeechT5ForTextToSpeech.from_pretrained(TTS_MODEL_PATH)
    _model.eval()

    log(f"Loading HiFi-GAN vocoder dari: {VOCODER_PATH}")
    _vocoder = SpeechT5HifiGan.from_pretrained(VOCODER_PATH)
    _vocoder.eval()

    log(f"Loading speaker embedding dari: {SPEAKER_EMBEDDING_PATH}")
    _speaker_embedding = torch.load(SPEAKER_EMBEDDING_PATH, map_location="cpu")

    # Pastikan shape [1, 512]
    if _speaker_embedding.dim() == 1:
        _speaker_embedding = _speaker_embedding.unsqueeze(0)

    log("SpeechT5 semua komponen berhasil di-load.")


# ---------------------------------------------------------------------------
# Playback helper
# ---------------------------------------------------------------------------

def _play_and_cleanup(filepath: str) -> None:
    try:
        _ensure_pygame()
        sound = pygame.mixer.Sound(filepath)
        channel = sound.play()

        while channel.get_busy():
            time.sleep(0.05)

        log(f"Playback selesai: {filepath}")
    except Exception as e:
        log(f"Playback error untuk {filepath}: {e}", level="ERROR")
    finally:
        try:
            os.remove(filepath)
            log(f"Temp file dihapus: {filepath}")
        except OSError as e:
            log(f"Gagal hapus temp file {filepath}: {e}", level="WARNING")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def speak(text: str) -> None:
    """
    Convert teks ke speech menggunakan model SpeechT5 lokal.
    Playback berjalan di background thread agar Flask tidak blocking.
    """
    if not text or not text.strip():
        raise ValueError("speak() menerima teks kosong.")

    stripped = text.strip()
    log(f"speak() dipanggil dengan: '{stripped}'")

    # Load model jika belum
    _load_models()

    # Proses teks
    inputs = _processor(text=stripped, return_tensors="pt")

    # Generate speech
    with torch.no_grad():
        speech = _model.generate_speech(
            inputs["input_ids"],
            _speaker_embedding,
            vocoder=_vocoder
        )

    # Simpan ke temp WAV
    os.makedirs(TEMP_DIR, exist_ok=True)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", dir=TEMP_DIR, delete=False)
    tmp.close()

    sf.write(tmp.name, speech.numpy(), SAMPLE_RATE)
    log(f"Audio berhasil digenerate: {tmp.name}")

    # Play di background thread
    thread = threading.Thread(
        target=_play_and_cleanup,
        args=(tmp.name,),
        daemon=True,
        name=f"tts-playback-{os.path.basename(tmp.name)}",
    )
    thread.start()
    log(f"Playback thread dimulai: {thread.name}")