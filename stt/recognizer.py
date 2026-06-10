import speech_recognition as sr
from config import LANGUAGE
from utils.logger import log

class SpeechRecognizer:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        # Adjust for ambient noise on init if needed, though often better done before listening
        log("SpeechRecognizer initialized using Google Speech API.")

    def recognize_audio_file(self, audio_file_bytes):
        """Recognize text from an uploaded audio file (WAV)."""
        log("Processing uploaded audio file...")
        try:
            import io
            with sr.AudioFile(io.BytesIO(audio_file_bytes)) as source:
                audio = self.recognizer.record(source)
            
            log("Sending to Google Speech API...")
            text = self.recognizer.recognize_google(audio, language="id-ID")
            log(f"Recognized: {text}")
            return text
            
        except sr.UnknownValueError:
            log("Could not understand audio", level="WARNING")
            return ""
        except sr.RequestError as e:
            log(f"Could not request results from service; {e}", level="ERROR")
            return ""
        except Exception as e:
            log(f"Error processing audio file: {e}", level="ERROR")
            return ""

