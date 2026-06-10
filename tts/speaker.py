import threading
import pyttsx3
from utils.logger import log

def speak(text: str) -> None:
    if not text or not text.strip():
        raise ValueError("speak() received empty text.")

    log(f"speak() [placeholder] called with: '{text}'")

    def _play():
        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()
        engine.stop()

    thread = threading.Thread(target=_play, daemon=True)
    thread.start()
    log("Playback thread started.")