# PTU-EAS — Kalkulator Suara Bahasa Indonesia

Aplikasi berbasis suara yang menggabungkan **Kalkulator Suara** (Speech-to-Text → hitung ekspresi matematika) dan **AudioBook Reader** (PDF → Text-to-Speech), ditenagai model Wav2Vec2 dan SpeechT5 yang di-fine-tune pada bahasa Indonesia.

---

## Arsitektur

```
PTU-EAS/
├── Backend (Flask · Python)          ← app.py + pdf_routes.py
│   ├── STT  : Wav2Vec2 (fine-tuned Indonesia)
│   └── TTS  : SpeechT5 + HiFi-GAN (fine-tuned Indonesia)
│
└── Frontend (React · Vite · TypeScript)  ← folder frontend/
    └── AudioBook Web App (proxy /pdf/* → Flask)
```

Kedua app berjalan secara **terpisah**, namun frontend memanggil API Flask melalui proxy Vite pada endpoint `/pdf/*`.

---

## Struktur Project

```
PTU-EAS/
│
├── app.py                  # Entry point Flask (route /, /tts, /speak, /upload_audio)
├── config.py               # Path model STT/TTS/vocoder
├── requirements.txt        # Python dependencies
├── download_vocoder.py     # Helper: download HiFi-GAN dari HuggingFace
├── pdf_routes.py           # Blueprint Flask untuk fitur PDF → TTS
├── .gitignore
│
├── stt/
│   └── recognizer.py       # SpeechRecognizer: Wav2Vec2ForCTC (lazy load)
│
├── tts/
│   └── speaker.py          # speak(): SpeechT5 + HiFi-GAN + x-vector embedding
│
├── core/
│   ├── parser.py           # Konversi teks Indonesia → ekspresi matematika
│   ├── calculator.py       # Evaluasi ekspresi matematika
│   └── normalizer.py       # Normalisasi teks sebelum parsing
│
├── utils/
│   └── logger.py           # Logger sederhana dengan timestamp
│
├── templates/
│   ├── index.html          # Halaman Kalkulator Suara (/)
│   └── tts.html            # Halaman Text to Speech (/tts)
│
├── static/
│   └── style.css           # CSS global untuk template Flask
│
├── models/                 # ⚠️ Tidak di-push ke repo (gitignored)
│   ├── wav2vec2-id/        # Model STT hasil fine-tuning
│   ├── speecht5-id/        # Model TTS hasil fine-tuning + speaker_embedding.pt
│   └── speecht5-hifigan/   # Vocoder HiFi-GAN
│
└── frontend/               # React/Vite App — AudioBook Reader
    ├── package.json
    ├── vite.config.ts      # Proxy /pdf/* → http://localhost:5000
    ├── README.md
    └── src/
        └── app/
            ├── App.tsx         # Komponen utama React
            ├── audiobook.js    # Logic AudioBook (upload PDF, TTS, navigasi)
            └── audiobook.css   # Styling AudioBook
```

---

## Persyaratan Sistem

| Komponen | Versi / Catatan |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| FFmpeg | Install sebagai sistem dependency (bukan pip) |
| PyTorch | 2.x (CPU atau CUDA) |

### Install FFmpeg (Windows)
```bash
winget install ffmpeg
```
Atau download manual dari https://ffmpeg.org dan tambahkan ke PATH.

---

## Instalasi Backend (Flask)

**1. Clone repository**
```bash
git clone https://github.com/ThriF3/PTU-EAS.git
cd PTU-EAS
```

**2. Buat virtual environment**
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac
```

**3. Install dependensi Python**
```bash
pip install -r requirements.txt
```

---

## Persiapan Model

Folder `models/` tidak ikut di-push ke repository. Model harus disiapkan secara manual.

### Struktur folder yang dibutuhkan:
```
models/
├── wav2vec2-id/
│   ├── config.json
│   ├── model.safetensors
│   ├── vocab.json
│   ├── tokenizer_config.json
│   └── preprocessor_config.json
├── speecht5-id/
│   ├── config.json
│   ├── model.safetensors
│   ├── tokenizer_config.json
│   └── speaker_embedding.pt
└── speecht5-hifigan/
    ├── config.json
    └── model.safetensors
```

### Download HiFi-GAN vocoder (otomatis):
```bash
python download_vocoder.py
```

> **Catatan:** Model `wav2vec2-id` dan `speecht5-id` merupakan hasil fine-tuning dan harus disalin secara manual dari Google Drive ke folder `models/`.

---

## Menjalankan Aplikasi

### Backend (Flask)
```bash
python app.py
```
Buka browser → `http://localhost:5000`

### Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev
```
Buka browser → `http://localhost:5173` (atau port yang ditampilkan terminal)

> **Pastikan Flask sudah berjalan** sebelum membuka frontend, karena frontend memanggil API `/pdf/*` dari Flask.

---

## Halaman & Endpoint

### Flask (Backend + Template)

| Halaman | URL | Fungsi |
|---|---|---|
| Kalkulator Suara | `GET /` | Rekam suara → STT → hitung ekspresi matematika |
| Text to Speech | `GET /tts` | Input teks → diucapkan model SpeechT5 |

### API Flask

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/upload_audio` | Terima file audio → STT → hitung → kembalikan hasil JSON |
| `POST` | `/speak` | Terima `{ "text": "..." }` → jalankan TTS |
| `POST` | `/pdf/upload` | Terima file PDF → ekstrak teks per chunk |
| `GET` | `/pdf/chunk/<id>` | Ambil chunk teks PDF |
| `GET` | `/pdf/speak/<id>` | Sintesis TTS per chunk PDF |

### Frontend (React)

| Halaman | Fungsi |
|---|---|
| Library | Daftar buku yang sudah diunggah |
| Upload PDF | Upload file PDF baru (judul + penulis) |
| Book Reader | Baca buku dengan TTS otomatis per kalimat |
| Voice Search | Cari buku menggunakan suara |

---

## Stack Teknologi

### Backend
| Komponen | Teknologi |
|---|---|
| Web Framework | Flask + Flask-CORS |
| STT Model | `indonesian-nlp/wav2vec2-large-xlsr-indonesian` (fine-tuned) |
| TTS Model | `microsoft/speecht5_tts` (fine-tuned) |
| Vocoder | `microsoft/speecht5_hifigan` |
| Audio Processing | soundfile, pydub, pygame |
| PDF Parsing | PyMuPDF (fitz) |
| ML Framework | PyTorch + HuggingFace Transformers |

### Frontend
| Komponen | Teknologi |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Components | MUI (Material UI) |

---

## Catatan Pengembangan

- Model di-load secara **lazy** (saat pertama kali request masuk) untuk menghindari lambatnya startup Flask.
- `sentencepiece` diperlukan sebagai dependency tokenizer SpeechT5 — pastikan terinstall.
- `ffmpeg` harus diinstall di level sistem (bukan via pip) agar `pydub` bisa memproses audio.
- Speaker embedding x-vector dihasilkan dari rata-rata 200 sample audio training.
- Frontend men-proxy semua request `/pdf/*` ke Flask via konfigurasi Vite (`vite.config.ts`).