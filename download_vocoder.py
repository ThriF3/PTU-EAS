from transformers import SpeechT5HifiGan

print("Downloading HiFi-GAN vocoder...")
vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan")
vocoder.save_pretrained("models/speecht5-hifigan")
print("Done! Saved to models/speecht5-hifigan/")