# ============================================================
# ai-ml/classifier/train_colab.py
# Role: Google Colab-optimised training script.
# Run this ONCE in a free Colab T4 session (GPU runtime).
#
# Steps:
#   1. pip install deps
#   2. Download ASVspoof 2019 LA dataset (or a subset)
#   3. Extract wav2vec2 embeddings on GPU (~20-40 min on T4)
#   4. Train LogisticRegression (~1 min)
#   5. Download model.pkl → commit to repo
#
# HOW TO USE:
#   - Go to https://colab.research.google.com
#   - Runtime → Change runtime type → T4 GPU
#   - Upload this file OR paste contents into a notebook cell
#   - Run top to bottom
# ============================================================

# ── Cell 1: Install dependencies ─────────────────────────────
# Run this cell first, then restart runtime when prompted

import subprocess, sys

deps = [
    "transformers",
    "torch",          # Colab usually has this, but pin anyway
    "soundfile",
    "librosa",
    "scikit-learn",
    "tqdm",
]
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q"] + deps)
print("✅ Dependencies installed")


# ── Cell 2: Download ASVspoof 2019 LA ────────────────────────
# The dataset requires a free account at https://datashare.ed.ac.uk
# After registering, download these two files and upload to Colab,
# OR use the direct download links if your institution has access.
#
# Files needed:
#   LA.zip  (audio files ~2.6 GB)
#   ASVspoof2019_LA_cm_protocols.zip  (protocol/label files, small)
#
# If you have a direct URL (e.g. from your institution's mirror):
# !wget -q "YOUR_URL_HERE" -O LA.zip
# !unzip -q LA.zip
#
# For demo purposes we use a SUBSET to keep training fast.
# Set USE_SUBSET = False to use the full training set.

USE_SUBSET = True        # True = fast demo model (~5 min), False = full (~40 min)
SUBSET_PER_CLASS = 500   # 500 bonafide + 500 spoof = 1000 files total

# Adjust these paths to wherever you extracted the dataset
import os
DATASET_ROOT   = "./LA"
TRAIN_AUDIO    = f"{DATASET_ROOT}/ASVspoof2019_LA_train/flac"
TRAIN_PROTOCOL = f"{DATASET_ROOT}/ASVspoof2019_LA_cm_protocols/ASVspoof2019.LA.cm.train.trn.txt"
DEV_AUDIO      = f"{DATASET_ROOT}/ASVspoof2019_LA_dev/flac"
DEV_PROTOCOL   = f"{DATASET_ROOT}/ASVspoof2019_LA_cm_protocols/ASVspoof2019.LA.cm.dev.trl.txt"

print(f"Dataset root exists: {os.path.isdir(DATASET_ROOT)}")


# ── Cell 3: Load wav2vec2 (frozen feature extractor) ─────────

import torch
import numpy as np
from transformers import Wav2Vec2Processor, Wav2Vec2Model
import soundfile as sf
import librosa
from tqdm import tqdm

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Running on: {DEVICE}")   # Should print 'cuda' in Colab T4

MODEL_NAME  = "facebook/wav2vec2-base-960h"
TARGET_SR   = 16_000
MAX_SAMPLES = 5 * TARGET_SR  # 5 seconds

print(f"Loading {MODEL_NAME}...")
processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
wav2vec   = Wav2Vec2Model.from_pretrained(MODEL_NAME).to(DEVICE)
wav2vec.eval()
for p in wav2vec.parameters():
    p.requires_grad = False   # frozen — no fine-tuning
print("✅ wav2vec2 loaded and frozen")


# ── Cell 4: Helper — extract one embedding ───────────────────

@torch.no_grad()
def extract_embedding(audio_path: str) -> np.ndarray:
    """Load audio, resample, pad/clip, run through wav2vec2, mean-pool."""
    try:
        waveform, sr = sf.read(audio_path, dtype="float32")
    except Exception:
        waveform, sr = librosa.load(audio_path, sr=None, mono=True)

    if waveform.ndim > 1:
        waveform = waveform.mean(axis=1)
    if sr != TARGET_SR:
        waveform = librosa.resample(waveform, orig_sr=sr, target_sr=TARGET_SR)
    if len(waveform) > MAX_SAMPLES:
        waveform = waveform[:MAX_SAMPLES]
    else:
        waveform = np.pad(waveform, (0, MAX_SAMPLES - len(waveform)))

    inputs = processor(waveform, sampling_rate=TARGET_SR,
                       return_tensors="pt", padding=True).to(DEVICE)
    out = wav2vec(**inputs)
    return out.last_hidden_state.squeeze(0).mean(dim=0).cpu().numpy()


# ── Cell 5: Parse protocol + extract embeddings ──────────────

def parse_protocol(path):
    """Returns list of (utterance_id, label) — label: 0=bonafide, 1=spoof."""
    records = []
    with open(path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            utt_id = parts[1]
            label  = 0 if parts[4] == "bonafide" else 1
            records.append((utt_id, label))
    return records


def build_embeddings(records, audio_dir, subset=False, n_per_class=500):
    """
    Extract embeddings for all records.
    If subset=True, cap at n_per_class per label for faster training.
    """
    if subset:
        bonafide = [(u, l) for u, l in records if l == 0][:n_per_class]
        spoof    = [(u, l) for u, l in records if l == 1][:n_per_class]
        records  = bonafide + spoof
        print(f"  Using subset: {len(bonafide)} bonafide + {len(spoof)} spoof")

    X, y = [], []
    for utt_id, label in tqdm(records, desc="Extracting embeddings"):
        path = os.path.join(audio_dir, f"{utt_id}.flac")
        if not os.path.exists(path):
            continue
        try:
            emb = extract_embedding(path)
            X.append(emb)
            y.append(label)
        except Exception as e:
            print(f"  Skipping {utt_id}: {e}")

    return np.array(X), np.array(y)


print("Extracting TRAIN embeddings...")
X_train, y_train = build_embeddings(
    parse_protocol(TRAIN_PROTOCOL),
    TRAIN_AUDIO,
    subset=USE_SUBSET,
    n_per_class=SUBSET_PER_CLASS
)
print(f"  X_train: {X_train.shape}  labels: {np.bincount(y_train)}")

print("Extracting DEV embeddings...")
X_dev, y_dev = build_embeddings(
    parse_protocol(DEV_PROTOCOL),
    DEV_AUDIO,
    subset=USE_SUBSET,
    n_per_class=200   # small dev set for quick eval
)
print(f"  X_dev: {X_dev.shape}")


# ── Cell 6: Train LogisticRegression ─────────────────────────

from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, roc_auc_score

print("Training LogisticRegression...")
clf = Pipeline([
    ("scaler", StandardScaler()),
    ("lr", LogisticRegression(
        max_iter=1000,
        C=1.0,
        solver="lbfgs",
        class_weight="balanced",
        random_state=42,
    ))
])
clf.fit(X_train, y_train)

# Evaluate
y_prob = clf.predict_proba(X_dev)[:, 1]
y_pred = clf.predict(X_dev)
print("\n" + classification_report(y_dev, y_pred, target_names=["bonafide", "spoof"]))
print(f"Dev ROC-AUC: {roc_auc_score(y_dev, y_prob):.4f}")


# ── Cell 7: Save and download model.pkl ──────────────────────

import pickle

MODEL_PATH = "model.pkl"
with open(MODEL_PATH, "wb") as f:
    pickle.dump(clf, f)
print(f"✅ model.pkl saved ({os.path.getsize(MODEL_PATH) / 1024:.0f} KB)")

# Auto-download from Colab to your local machine
try:
    from google.colab import files
    files.download(MODEL_PATH)
    print("✅ Download started — check your browser downloads")
except ImportError:
    print("Not running in Colab — model.pkl is saved locally.")

# After downloading:
# 1. Copy model.pkl into ai-ml/classifier/
# 2. git add ai-ml/classifier/model.pkl
# 3. git commit -m "Add pretrained model.pkl"
# 4. git push — team can now use it from Day 1
