import io
import re

import fitz  # PyMuPDF
import torch
import soundfile as sf
from flask import Blueprint, request, jsonify, send_file
import re
import unicodedata

import tts.speaker as spk
from tts.speaker import _load_models, SAMPLE_RATE
from utils.logger import log

from typing import List

pdf_bp = Blueprint('pdf', __name__)

# ---------------------------------------------------------------------------
# Normalisasi teks untuk TTS
# ---------------------------------------------------------------------------

# Pola singkatan: 2+ huruf kapital berurutan (misal: TTS, AI, PDF, URL)
_ACRONYM_RE = re.compile(r'\b([A-Z]{2,})\b')

# Simbol yang diizinkan: huruf, angka, spasi, titik, koma, tanda tanya, tanda seru
_ALLOWED_RE = re.compile(r'[^\w\s.,!?]', re.UNICODE)

# Spasi berlebih
_MULTI_SPACE_RE = re.compile(r'\s+')


def _expand_acronyms(text: str) -> str:
    """
    Mengubah singkatan huruf kapital menjadi huruf yang dipisah spasi.
    Contoh: TTS -> T T S | AI -> A I | PDF -> P D F
    """
    return _ACRONYM_RE.sub(lambda m: ' '.join(list(m.group())), text)


def _strip_symbols(text: str) -> str:
    """
    Menghapus semua simbol yang tidak dapat dibaca model TTS.
    Hanya menyisakan huruf, angka, spasi, dan tanda baca dasar.
    """
    text = unicodedata.normalize("NFKC", text)
    text = "".join(ch if ch.isalnum() or ch.isspace() else "" for ch in text)
    return _MULTI_SPACE_RE.sub(" ", text).strip()
    


def _normalize_chunk_for_tts(text: str) -> str:
    """
    Pipeline normalisasi lengkap sebelum dikirim ke model TTS:
    1. Perluas singkatan (TTS → T T S)
    2. Jalankan normalisasi angka & simbol dari speaker.py
    3. Hapus simbol yang tersisa
    """
    # Langkah 1: Perluas singkatan
    text = _expand_acronyms(text)

    # Langkah 2: Normalisasi angka & simbol matematika (dari speaker.py)
    text = spk._normalize_for_tts(text)

    # Langkah 3: Hapus simbol yang tersisa
    text = _strip_symbols(text)

    return text


# ---------------------------------------------------------------------------
# Pemecahan kalimat & pengelompokan chunk
# ---------------------------------------------------------------------------

# Pisah pada akhir kalimat (titik, tanda seru, tanda tanya) diikuti spasi/baris baru
_SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?])\s+')


def _clean_pdf_text(text: str) -> str:
    """Bersihkan teks hasil ekstraksi PDF dari artefak umum."""
    # Gabungkan tanda hubung di akhir baris (kata terpotong)
    text = re.sub(r'-\n', '', text)
    # Ganti baris baru tunggal dengan spasi (bukan paragraf baru)
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    # Ganti beberapa baris baru dengan satu baris baru
    text = re.sub(r'\n{2,}', ' ', text)
    # Spasi berlebih
    text = _MULTI_SPACE_RE.sub(' ', text).strip()
    return text


def _split_into_sentences(text: str) -> list[str]:
    """Pecah teks menjadi daftar kalimat."""
    sentences = _SENTENCE_SPLIT_RE.split(text)
    return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 1]


def _group_into_chunks(sentences: list[str], max_chars: int = 500) -> list[str]:
    """
    Kelompokkan kalimat-kalimat ke dalam chunk dengan batas karakter.
    Jika sebuah kalimat terpotong karena melebihi batas, sisa teksnya
    akan dibawa ke awal chunk berikutnya.
    """
    def _split_at_boundary(text: str, limit: int) -> tuple[str, str]:
        """
        Pecah teks menjadi (bagian_pertama, sisa).
        Diutamakan pecah di spasi terakhir sebelum limit.
        Jika tidak ada spasi, lakukan pemotongan langsung.
        """
        if len(text) <= limit:
            return text, ""

        split_at = text.rfind(" ", 0, limit + 1)
        if split_at <= 0:
            split_at = limit

        head = text[:split_at].strip()
        tail = text[split_at:].lstrip()
        return head, tail

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
            # Kalau chunk sekarang masih kosong
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

            added_len = len(sent) + 1  # +1 untuk spasi pemisah

            if current_len + added_len <= max_chars:
                current_sentences.append(sent)
                current_len += added_len
                sent = ""
            else:
                # Tutup chunk sekarang, lalu lanjutkan sisa kalimat ke chunk berikutnya
                flush_current()

    flush_current()
    return chunks


# ---------------------------------------------------------------------------
# Endpoint: Unggah PDF
# ---------------------------------------------------------------------------

@pdf_bp.route('/pdf/upload', methods=['POST'])
def upload_pdf():
    """
    Menerima file PDF beserta judul dan penulis.
    Mengembalikan daftar chunk teks yang siap dibaca.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Tidak ada file PDF yang diunggah'}), 400

    pdf_file = request.files['file']
    title = request.form.get('title', '').strip() or 'Tanpa Judul'
    author = request.form.get('author', '').strip() or 'Tanpa Penulis'

    if not pdf_file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Hanya file PDF yang diizinkan'}), 400

    try:
        pdf_bytes = pdf_file.read()

        # Buka PDF dengan PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        raw_text = ''
        for page in doc:
            raw_text += page.get_text()
        doc.close()

        if not raw_text.strip():
            return jsonify({'error': 'PDF tidak memiliki teks yang dapat dibaca'}), 400

        # Bersihkan dan pecah teks
        clean_text = _clean_pdf_text(raw_text)
        sentences = _split_into_sentences(clean_text)
        chunks = _group_into_chunks(sentences, max_chars=100)

        if not chunks:
            return jsonify({'error': 'Tidak dapat mengekstrak teks dari PDF ini'}), 400

        log(f"PDF diunggah: '{title}' oleh '{author}', {len(chunks)} chunk dari {len(sentences)} kalimat")

        return jsonify({
            'title': title,
            'author': author,
            'chunks': chunks,
            'total': len(chunks),
        })

    except Exception as e:
        log(f"Error memproses PDF: {e}", level='ERROR')
        return jsonify({'error': f'Gagal memproses PDF: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# Endpoint: Sintesis suara untuk satu chunk teks
# ---------------------------------------------------------------------------

@pdf_bp.route('/pdf/speak-chunk', methods=['POST'])
def speak_chunk():
    """
    Menerima teks chunk, menormalisasi, lalu mengembalikan audio WAV
    yang diputar langsung di browser (bukan melalui speaker server).
    """
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        return jsonify({'error': 'Tidak ada teks yang diberikan'}), 400

    raw_text = data['text'].strip()
    if not raw_text:
        return jsonify({'error': 'Teks kosong'}), 400

    # Normalisasi lengkap
    normalized = _normalize_chunk_for_tts(raw_text)
    if not normalized:
        return jsonify({'error': 'Teks kosong setelah normalisasi'}), 400

    log(f"speak-chunk: '{normalized[:80]}...' ({len(normalized)} karakter)")

    try:
        # Muat model jika belum dimuat
        _load_models()

        # Tokenisasi
        inputs = spk._processor(text=normalized, return_tensors='pt')

        # Generate waveform
        with torch.no_grad():
            speech = spk._model.generate_speech(
                inputs['input_ids'],
                spk._speaker_embedding,
                vocoder=spk._vocoder,
            )

        # Tulis ke buffer in-memory (tidak menyentuh disk)
        buf = io.BytesIO()
        sf.write(buf, speech.numpy(), SAMPLE_RATE, format='WAV')
        buf.seek(0)

        return send_file(buf, mimetype='audio/wav', as_attachment=False)

    except Exception as e:
        log(f"Error TTS speak-chunk: {e}", level='ERROR')
        return jsonify({'error': f'Gagal menghasilkan audio: {str(e)}'}), 500
