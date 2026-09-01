# ============================================================
# ai_ml/classifier/train_mfcc_fallback.py
# Role: BACKUP training script — zero GPU needed, trains in ~2 min.
#
# Use this ONLY if you cannot run train_colab.py in time.
# Instead of wav2vec2 embeddings, uses MFCC features (39-dim)
# extracted with librosa. Much less accurate (~75-80% vs ~90%+)
# but produces a working model.pkl instantly on any laptop.
#
# For demo purposes this is totally fine — the pipeline works
# identically, the score just has lower precision.
# ============================================================

import os
import pickle
import numpy as np
import librosa
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, roc_auc_score
from tqdm import tqdm

TARGET_SR   = 16_000
MAX_SAMPLES = 5 * TARGET_SR
N_MFCC      = 13    # 13 MFCCs + delta + delta-delta = 39 features

DATASET_ROOT   = Path(os.getenv("ASVSPOOF_ROOT", "./data/LA"))
TRAIN_PROTOCOL = DATASET_ROOT / "ASVspoof2019_LA_cm_protocols/ASVspoof2019.LA.cm.train.trn.txt"
DEV_PROTOCOL   = DATASET_ROOT / "ASVspoof2019_LA_cm_protocols/ASVspoof2019.LA.cm.dev.trl.txt"
TRAIN_AUDIO    = DATASET_ROOT / "ASVspoof2019_LA_train/flac"
DEV_AUDIO      = DATASET_ROOT / "ASVspoof2019_LA_dev/flac"
OUTPUT_MODEL   = Path("model.pkl")


def extract_mfcc(audio_path: str) -> np.ndarray:
    """
    Extract 39-dim MFCC feature vector:
    13 MFCCs + 13 delta + 13 delta-delta, each mean-pooled over time.
    Fast: ~50ms per file on CPU.
    """
    waveform, sr = librosa.load(audio_path, sr=TARGET_SR, mono=True,
                                duration=5.0)  # cap at 5 seconds
    mfcc   = librosa.feature.mfcc(y=waveform, sr=sr, n_mfcc=N_MFCC)
    delta  = librosa.feature.delta(mfcc)
    delta2 = librosa.feature.delta(mfcc, order=2)
    combined = np.concatenate([mfcc, delta, delta2], axis=0)  # (39, T)
    return combined.mean(axis=1)   # mean-pool over time → (39,)


def parse_protocol(path, subset=True, n_per_class=1000):
    records = []
    with open(path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            records.append((parts[1], 0 if parts[4] == "bonafide" else 1))
    if subset:
        bon   = [(u, l) for u, l in records if l == 0][:n_per_class]
        spoof = [(u, l) for u, l in records if l == 1][:n_per_class]
        return bon + spoof
    return records


def build_features(records, audio_dir):
    X, y = [], []
    for utt_id, label in tqdm(records, desc="Extracting MFCCs"):
        path = audio_dir / f"{utt_id}.flac"
        if not path.exists():
            continue
        try:
            feat = extract_mfcc(str(path))
            X.append(feat)
            y.append(label)
        except Exception as e:
            print(f"  Skip {utt_id}: {e}")
    return np.array(X), np.array(y)


if __name__ == "__main__":
    print("Parsing protocols...")
    train_records = parse_protocol(TRAIN_PROTOCOL, subset=True, n_per_class=1000)
    dev_records   = parse_protocol(DEV_PROTOCOL,   subset=True, n_per_class=300)

    print("Extracting training MFCCs (~2 min on CPU)...")
    X_train, y_train = build_features(train_records, TRAIN_AUDIO)
    X_dev, y_dev     = build_features(dev_records, DEV_AUDIO)

    print("Training LogisticRegression...")
    clf = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(max_iter=1000, class_weight="balanced",
                                  C=1.0, random_state=42))
    ])
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_dev)
    y_prob = clf.predict_proba(X_dev)[:, 1]
    print(classification_report(y_dev, y_pred, target_names=["bonafide", "spoof"]))
    print(f"Dev ROC-AUC: {roc_auc_score(y_dev, y_prob):.4f}")

    with open(OUTPUT_MODEL, "wb") as f:
        pickle.dump(clf, f)
    print(f"✅ model.pkl saved — copy to ai_ml/classifier/")
