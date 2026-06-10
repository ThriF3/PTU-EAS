from flask import Flask, render_template, jsonify, request
from stt.recognizer import SpeechRecognizer
from core.parser import parse_text
from core.calculator import calculate
from core.normalizer import normalize
from tts.speaker import speak
from utils.logger import log
import traceback

app = Flask(__name__)

# Initialize recognizer lazily or globally
# Global initialization means the model is loaded when the server starts.
# We will set it to None initially and load it upon first request to avoid crash if model is missing.
recognizer = None

def get_recognizer():
    global recognizer
    if recognizer is None:
        recognizer = SpeechRecognizer()
    return recognizer

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload_audio', methods=['POST'])
def upload_audio():
    rec = get_recognizer()
    if not rec:
        return jsonify({"error": "Failed to initialize recognizer."}), 500

    try:
        log("API /upload_audio called. Receiving audio...")
        
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file uploaded"}), 400
            
        audio_file = request.files['audio']
        audio_bytes = audio_file.read()
        
        if not audio_bytes:
            return jsonify({"error": "Empty audio file"}), 400
            
        # 1. Process audio file
        text = rec.recognize_audio_file(audio_bytes)
        if not text:
            return jsonify({"error": "No speech detected"}), 400
            
        # 2. Normalize and Parse
        normalized_text = normalize(text)
        log(f"DEBUG - Normalized Text: '{normalized_text}'")
        
        expression = parse_text(normalized_text)
        log(f"DEBUG - Parsed Math Expression: '{expression}'")
        
        # 3. Calculate
        if not expression:
            return jsonify({"recognized_text": text, "normalized_text": normalized_text, "expression": "", "result": "", "error": "Could not parse expression"})
            
        result = calculate(expression)
        
        return jsonify({
            "recognized_text": text,
            "normalized_text": normalized_text,
            "expression": expression,
            "result": result
        })
        
    except Exception as e:
        log(f"Error in /listen: {traceback.format_exc()}", level="ERROR")
        return jsonify({"error": str(e)}), 500

@app.route('/tts')
def tts_page():
    return render_template('tts.html')

@app.route('/speak', methods=['POST'])
def speak_route():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    try:
        speak(text)
        return jsonify({"success": True})
    except Exception as e:
        log(f"Error in /speak: {traceback.format_exc()}", level="ERROR")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
