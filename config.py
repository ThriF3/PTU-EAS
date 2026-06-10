import os

# Konfigurasi umum
LANGUAGE = "id"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# STT — Wav2Vec2
MODEL_PATH = os.path.join(BASE_DIR, "models", "wav2vec2-id")

# TTS — SpeechT5
TTS_MODEL_PATH = os.path.join(BASE_DIR, "models", "speecht5-id")
VOCODER_PATH = os.path.join(BASE_DIR, "models", "speecht5-hifigan")
SPEAKER_EMBEDDING_PATH = os.path.join(BASE_DIR, "models", "speecht5-id", "speaker_embedding.pt")