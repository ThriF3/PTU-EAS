import io
import re
import os
import json
import uuid
import unicodedata
from datetime import datetime
from typing import List

import fitz  # PyMuPDF
import torch
import soundfile as sf
from flask import Blueprint, request, jsonify, send_file

import tts.speaker as spk
from tts.speaker import _load_models, SAMPLE_RATE
from utils.logger import log

pdf_bp = Blueprint('pdf', __name__)

# ---------------------------------------------------------------------------
# Folder penyimpanan PDF & metadata
# ---------------------------------------------------------------------------

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'pdfs')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ---------------------------------------------------------------------------
# Normalisasi teks untuk TTS
# ---------------------------------------------------------------------------

_ACRONYM_RE   = re.compile(r'\b([A-Z]{2,})\b')
_MULTI_SPACE_RE = re.compile(r'\s+')


def _expand_acronyms(text: str) -> str:
    """TTS -> T T S | AI -> A I | PDF -> P D F"""
    return _ACRONYM_RE.sub(lambda m: ' '.join(list(m.group())), text)


def _strip_symbols(text: str) -> str:
    """Hanya sisakan huruf, angka, spasi."""
    text = unicodedata.normalize("NFKC", text)
    text = "".join(ch if ch.isalnum() or ch.isspace() else "" for ch in text)
    return _MULTI_SPACE_RE.sub(" ", text).strip()


def _normalize_chunk_for_tts(text: str) -> str:
    text = _expand_acronyms(text)
    text = spk._normalize_for_tts(text)
    text = _strip_symbols(text)
    return text


# ---------------------------------------------------------------------------
# Pemecahan kalimat & pengelompokan chunk
# ---------------------------------------------------------------------------

_SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?])\s+')


def _clean_pdf_text(text: str) -> str:
    text = re.sub(r'-\n', '', text)
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    text = re.sub(r'\n{2,}', ' ', text)
    text = _MULTI_SPACE_RE.sub(' ', text).strip()
    return text


def _split_into_sentences(text: str) -> list[str]:
    sentences = _SENTENCE_SPLIT_RE.split(text)
    return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 1]


def _group_into_chunks(sentences: list[str], max_chars: int = 100) -> list[str]:
    def _split_at_boundary(text: str, limit: int) -> tuple[str, str]:
        if len(text) <= limit:
            return text, ""
        split_at = text.rfind(" ", 0, limit + 1)
        if split_at <= 0:
            split_at = limit
        return text[:split_at].strip(), text[split_at:].lstrip()

    chunks: list[str] = []
    current_sentences: list[str] = []
    current_len = 0

    def flush_current() -> None:
        nonlocal current_sentences, current_len
        if current_sentences:
            chunks.append(" ".join(current_sentences))
            current_sentences = []
            current_len = 0

    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        while sent:
            if not current_sentences:
                if len(sent) <= max_chars:
                    current_sentences.append(sent)
                    current_len = len(sent)
                    sent = ""
                else:
                    head, sent = _split_at_boundary(sent, max_chars)
                    if head:
                        chunks.append(head)
                continue
            added_len = len(sent) + 1
            if current_len + added_len <= max_chars:
                current_sentences.append(sent)
                current_len += added_len
                sent = ""
            else:
                flush_current()

    flush_current()
    return chunks


def _extract_chunks_from_bytes(pdf_bytes: bytes) -> list[str]:
    """Buka PDF dari bytes, ekstrak teks, pecah jadi chunks."""
    doc = fitz.open(stream=pdf_bytes, filetype='pdf')
    raw_text = ''
    for page in doc:
        raw_text += page.get_text()
    doc.close()

    if not raw_text.strip():
        raise ValueError('PDF tidak memiliki teks yang dapat dibaca')

    clean_text = _clean_pdf_text(raw_text)
    sentences  = _split_into_sentences(clean_text)
    chunks     = _group_into_chunks(sentences, max_chars=100)

    if not chunks:
        raise ValueError('Tidak dapat mengekstrak teks dari PDF ini')

    return chunks


# ---------------------------------------------------------------------------
# Endpoint: Unggah & simpan PDF baru
# ---------------------------------------------------------------------------

@pdf_bp.route('/pdf/upload', methods=['POST'])
def upload_pdf():
    """
    Terima PDF + judul + penulis.
    Simpan file .pdf dan metadata .json ke UPLOAD_FOLDER.
    Kembalikan chunks + book_id.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Tidak ada file PDF yang diunggah'}), 400

    pdf_file = request.files['file']
    title    = request.form.get('title',  '').strip() or 'Tanpa Judul'
    author   = request.form.get('author', '').strip() or 'Tanpa Penulis'

    if not pdf_file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Hanya file PDF yang diizinkan'}), 400

    try:
        pdf_bytes = pdf_file.read()
        chunks    = _extract_chunks_from_bytes(pdf_bytes)

        # Simpan file PDF
        book_id  = str(uuid.uuid4())
        pdf_path  = os.path.join(UPLOAD_FOLDER, f'{book_id}.pdf')
        json_path = os.path.join(UPLOAD_FOLDER, f'{book_id}.json')

        with open(pdf_path, 'wb') as f:
            f.write(pdf_bytes)

        # Simpan metadata JSON
        metadata = {
            'id':          book_id,
            'title':       title,
            'author':      author,
            'filename':    pdf_file.filename,
            'chunk_count': len(chunks),
            'upload_date': datetime.now().isoformat(),
        }
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        log(f"PDF disimpan: '{title}' oleh '{author}' → {book_id} ({len(chunks)} chunk)")

        return jsonify({
            'id':     book_id,
            'title':  title,
            'author': author,
            'chunks': chunks,
            'total':  len(chunks),
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        log(f"Error memproses PDF: {e}", level='ERROR')
        return jsonify({'error': f'Gagal memproses PDF: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# Endpoint: Daftar semua buku tersimpan
# ---------------------------------------------------------------------------

@pdf_bp.route('/pdf/library', methods=['GET'])
def get_library():
    """
    Kembalikan daftar semua buku yang tersimpan di UPLOAD_FOLDER,
    diurutkan dari yang terbaru.
    """
    books = []
    try:
        for fname in os.listdir(UPLOAD_FOLDER):
            if not fname.endswith('.json'):
                continue
            fpath = os.path.join(UPLOAD_FOLDER, fname)
            with open(fpath, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            # Pastikan file PDF-nya masih ada
            pdf_path = os.path.join(UPLOAD_FOLDER, f"{meta['id']}.pdf")
            if os.path.exists(pdf_path):
                books.append(meta)
    except Exception as e:
        log(f"Error membaca library: {e}", level='ERROR')
        return jsonify({'error': str(e)}), 500

    # Urutkan terbaru dulu
    books.sort(key=lambda b: b.get('upload_date', ''), reverse=True)
    return jsonify(books)


# ---------------------------------------------------------------------------
# Endpoint: Buka buku dari library berdasarkan ID
# ---------------------------------------------------------------------------

@pdf_bp.route('/pdf/open/<book_id>', methods=['POST'])
def open_book(book_id):
    """
    Baca PDF tersimpan berdasarkan book_id.
    Kembalikan chunks + metadata buku.
    """
    json_path = os.path.join(UPLOAD_FOLDER, f'{book_id}.json')
    pdf_path  = os.path.join(UPLOAD_FOLDER, f'{book_id}.pdf')

    if not os.path.exists(json_path) or not os.path.exists(pdf_path):
        return jsonify({'error': 'Buku tidak ditemukan'}), 404

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)

        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()

        chunks = _extract_chunks_from_bytes(pdf_bytes)

        log(f"Membuka buku: '{meta['title']}' ({len(chunks)} chunk)")

        return jsonify({
            'id':     book_id,
            'title':  meta['title'],
            'author': meta['author'],
            'chunks': chunks,
            'total':  len(chunks),
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        log(f"Error membuka buku {book_id}: {e}", level='ERROR')
        return jsonify({'error': f'Gagal membuka buku: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# Endpoint: Sintesis suara untuk satu chunk teks
# ---------------------------------------------------------------------------

@pdf_bp.route('/pdf/speak-chunk', methods=['POST'])
def speak_chunk():
    """
    Terima teks chunk, normalisasi, kembalikan audio WAV.
    """
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        return jsonify({'error': 'Tidak ada teks yang diberikan'}), 400

    raw_text = data['text'].strip()
    if not raw_text:
        return jsonify({'error': 'Teks kosong'}), 400

    normalized = _normalize_chunk_for_tts(raw_text)
    if not normalized:
        return jsonify({'error': 'Teks kosong setelah normalisasi'}), 400

    log(f"speak-chunk: '{normalized[:80]}...' ({len(normalized)} karakter)")

    try:
        _load_models()

        inputs = spk._processor(text=normalized, return_tensors='pt')

        with torch.no_grad():
            speech = spk._model.generate_speech(
                inputs['input_ids'],
                spk._speaker_embedding,
                vocoder=spk._vocoder,
            )

        buf = io.BytesIO()
        sf.write(buf, speech.numpy(), SAMPLE_RATE, format='WAV')
        buf.seek(0)

        return send_file(buf, mimetype='audio/wav', as_attachment=False)

    except Exception as e:
        log(f"Error TTS speak-chunk: {e}", level='ERROR')
        return jsonify({'error': f'Gagal menghasilkan audio: {str(e)}'}), 500