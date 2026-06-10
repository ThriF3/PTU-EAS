import io
import numpy as np
import soundfile as sf
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
from config import MODEL_PATH
from utils.logger import log

TARGET_SAMPLE_RATE = 16000

class SpeechRecognizer:
    def __init__(self):
        log(f"Loading Wav2Vec2 model from: {MODEL_PATH}")
        self.processor = Wav2Vec2Processor.from_pretrained(MODEL_PATH)
        self.model = Wav2Vec2ForCTC.from_pretrained(MODEL_PATH)
        self.model.eval()
        log("Wav2Vec2 model loaded successfully.")

    def recognize_audio_file(self, audio_file_bytes):
        """Recognize text from an uploaded audio file (WAV)."""
        log("Processing uploaded audio file...")
        try:
            # Load audio from bytes
            audio_array, sample_rate = sf.read(io.BytesIO(audio_file_bytes))

            # Convert stereo to mono jika perlu
            if audio_array.ndim > 1:
                audio_array = audio_array.mean(axis=1)

            # Resample ke 16kHz jika perlu (frontend sudah 16kHz, ini jaga-jaga)
            if sample_rate != TARGET_SAMPLE_RATE:
                log(f"Resampling from {sample_rate}Hz to {TARGET_SAMPLE_RATE}Hz...", level="WARNING")
                num_samples = int(len(audio_array) * TARGET_SAMPLE_RATE / sample_rate)
                audio_array = np.interp(
                    np.linspace(0, len(audio_array), num_samples),
                    np.arange(len(audio_array)),
                    audio_array
                )

            # Proses input untuk model
            inputs = self.processor(
                audio_array.astype(np.float32),
                sampling_rate=TARGET_SAMPLE_RATE,
                return_tensors="pt"
            )

            # Inference (tanpa gradient untuk efisiensi)
            with torch.no_grad():
                logits = self.model(**inputs).logits

            # Decode hasil prediksi
            predicted_ids = torch.argmax(logits, dim=-1)
            transcription = self.processor.batch_decode(predicted_ids)[0].lower()

            log(f"Recognized: {transcription}")
            return transcription

        except Exception as e:
            log(f"Error processing audio file: {e}", level="ERROR")
            return ""