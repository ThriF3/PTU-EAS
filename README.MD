# PTU-EAS — Kalkulator Suara Bahasa Indonesia

Aplikasi kalkulator berbasis suara menggunakan Flask, dengan model STT (Wav2Vec2) dan TTS (SpeechT5) yang di-fine-tune pada ekspresi matematika bahasa Indonesia.

---

## Persyaratan Sistem

- Python 3.10+
- [FFmpeg](https://ffmpeg.org/download.html) — install sebagai sistem dependency (bukan pip)

Untuk Windows, FFmpeg bisa diinstall via [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/):
```bash
winget install ffmpeg
```
Atau download manual dari https://ffmpeg.org dan tambahkan ke PATH.

---

## Instalasi

**1. Clone repository**
```bash
git clone https://github.com/ThriF3/PTU-EAS.git
cd PTU-EAS
```

**2. Buat virtual environment**
```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # Linux/Mac
```

**3. Install dependensi**
```bash
pip install -r requirements.txt
```

---

## Persiapan Model

Folder `models/` tidak ikut di-push ke repository (gitignored). Model harus disiapkan secara manual.

Struktur folder yang dibutuhkan:
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

Untuk mendownload HiFi-GAN vocoder secara otomatis:
```bash
python download_vocoder.py
```

Model `wav2vec2-id` dan `speecht5-id` merupakan hasil fine-tuning dan perlu disalin secara manual dari Google Drive ke folder `models/`.

---

## Menjalankan Aplikasi

```bash
python app.py
```

Buka browser dan akses:
```
http://localhost:5000
```

## Run frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Halaman Aplikasi

| Halaman | URL | Fungsi |
|---|---|---|
| Kalkulator Suara | `/` | Rekam suara, kenali ekspresi matematika, tampilkan hasil |
| Text to Speech | `/tts` | Masukkan teks, diucapkan menggunakan model SpeechT5 |