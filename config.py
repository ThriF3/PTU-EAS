import os

# Configuration Settings
LANGUAGE = "id"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Path ke model Wav2Vec2 lokal
# Letakkan file model di folder: models/wav2vec2-id/
MODEL_PATH = os.path.join(BASE_DIR, "models", "wav2vec2-id")