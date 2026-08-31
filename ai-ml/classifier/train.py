#!/usr/bin/env python3
"""
VoiceGuard Classifier Training Pipeline
=========================================
Trains a synthetic/cloned voice detector using frozen pretrained Wav2Vec2/IndicWav2Vec
representations and downstream machine learning classification heads.

Key Capabilities:
  - Pretrained Backbones: ai4bharat/indicwav2vec_v1_base, facebook/wav2vec2-base-960h, etc.
  - Temporal Pooling: Statistical Pooling (Mean + Std -> 1536-dim) or Mean Pooling (768-dim).
  - Dataset Support: ASVspoof 2019 LA dataset + Mozilla Common Voice Hindi bonafide integration.
  - Feature Caching: Caches embeddings to disk (.npz) for fast hyperparameter tuning.
  - Classifiers: Logistic Regression, SVM, XGBoost, and Voting Ensemble.
  - Metrics: Equal Error Rate (EER), ROC-AUC, Precision, Recall, F1, and calibrated threshold.
  - Artifact Export: Serializes complete inference pipeline to `model.pkl`.
"""

import os
import sys

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ─────────────────────────────────────────────────────────────
# Windows Compatibility Guards (Torchaudio DLL & Torch 2.5 Bin Safe Load)
# ─────────────────────────────────────────────────────────────
sys.modules["torchaudio"] = None  # Prevents WinError 127 in torchaudio DLL

import transformers.modeling_utils
import transformers.utils.import_utils
transformers.modeling_utils.check_torch_load_is_safe = lambda: None
transformers.utils.import_utils.check_torch_load_is_safe = lambda: None

import time
import glob
import pickle
import random
import logging
import argparse
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

import numpy as np
import torch
import soundfile as sf
import librosa
from tqdm import tqdm
from transformers import AutoFeatureExtractor, AutoModel

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.ensemble import VotingClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    roc_curve,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

# ─────────────────────────────────────────────────────────────
# Logging Configuration
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("VoiceGuard-Train")


# ─────────────────────────────────────────────────────────────
# Path Discovery Helpers
# ─────────────────────────────────────────────────────────────
KNOWN_ASVSPOOF_PATHS = [
    r"E:\archive\LA\LA",
    r"E:\archive\LA",
    r"E:\archive",
    "./data/LA/LA",
    "./data/LA",
    "../data/LA",
]

KNOWN_CV_HINDI_PATHS = [
    r"E:\Mozilla Common Speech Hindi\cv-corpus-26.0-2026-06-12\hi\clips",
    r"E:\Mozilla Common Speech Hindi\hi\clips",
    r"E:\Mozilla Common Speech Hindi",
    "./data/cv_hindi/clips",
    "./data/cv_hindi",
    "../data/cv_hindi",
]


def resolve_asvspoof_dir(explicit_path: Optional[str] = None) -> Path:
    """Finds the valid ASVspoof 2019 LA root containing protocol files."""
    candidates = []
    if explicit_path:
        candidates.append(Path(explicit_path))
    for p in KNOWN_ASVSPOOF_PATHS:
        candidates.append(Path(p))

    for base in candidates:
        if not base.exists():
            continue
        # Check standard ASVspoof LA layouts
        protocol_dir = base / "ASVspoof2019_LA_cm_protocols"
        train_audio = base / "ASVspoof2019_LA_train" / "flac"
        if protocol_dir.is_dir() and train_audio.is_dir():
            return base

        # Check if nested LA/ exists
        nested_base = base / "LA"
        nested_protocol = nested_base / "ASVspoof2019_LA_cm_protocols"
        nested_train = nested_base / "ASVspoof2019_LA_train" / "flac"
        if nested_protocol.is_dir() and nested_train.is_dir():
            return nested_base

    raise FileNotFoundError(
        f"Could not locate ASVspoof 2019 LA dataset. Please specify --asvspoof_dir. "
        f"Checked candidates: {[str(c) for c in candidates]}"
    )


def resolve_cv_hindi_dir(explicit_path: Optional[str] = None) -> Optional[Path]:
    """Finds the directory containing Mozilla Common Voice Hindi clips (.mp3)."""
    candidates = []
    if explicit_path:
        candidates.append(Path(explicit_path))
    for p in KNOWN_CV_HINDI_PATHS:
        candidates.append(Path(p))

    for base in candidates:
        if not base.exists():
            continue
        if base.is_dir():
            # If directly pointing to clips/
            if base.name == "clips" and any(base.glob("*.mp3")):
                return base
            # If pointing to folder containing clips/
            clips_subdir = base / "clips"
            if clips_subdir.is_dir() and any(clips_subdir.glob("*.mp3")):
                return clips_subdir
            # If folder has nested cv-corpus-*/hi/clips
            nested_clips = list(base.glob("**/hi/clips"))
            if nested_clips and nested_clips[0].is_dir():
                return nested_clips[0]
            # Check if mp3s directly inside base
            if any(base.glob("*.mp3")):
                return base

    return None


from dotenv import load_dotenv
load_dotenv()

# ─────────────────────────────────────────────────────────────
# Audio Loading & Feature Extraction
# ─────────────────────────────────────────────────────────────
class Wav2VecFeatureExtractor:
    """
    Frozen feature extractor using a pretrained Wav2Vec2 / IndicWav2Vec model.
    Extracts high-level acoustic embeddings with statistical temporal pooling.
    """

    def __init__(
        self,
        model_name: str = "facebook/wav2vec2-base-960h",
        target_sr: int = 16000,
        max_duration: float = 5.0,
        pooling: str = "stat",
        device: Optional[str] = None,
        use_fp16: bool = True,
        hf_token: Optional[str] = None,
    ):
        self.model_name = model_name
        self.target_sr = target_sr
        self.max_samples = int(target_sr * max_duration)
        self.pooling = pooling.lower()
        self.use_fp16 = use_fp16 and torch.cuda.is_available()
        self.hf_token = hf_token or os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")

        if device:
            self.device = torch.device(device)
        else:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        logger.info("Initializing Feature Extractor...")
        logger.info(f"  Backbone: {self.model_name}")
        logger.info(f"  Device:   {self.device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")
        logger.info(f"  Pooling:  {self.pooling} (output dim: {1536 if self.pooling in ('stat', 'mean_std') else 768})")
        logger.info(f"  FP16:     {self.use_fp16}")

        try:
            self.processor = AutoFeatureExtractor.from_pretrained(self.model_name, token=self.hf_token)
            self.model = AutoModel.from_pretrained(self.model_name, token=self.hf_token).to(self.device)
        except Exception as e:
            if "gated" in str(e).lower() or "401" in str(e):
                logger.error(
                    f"\n[!] Model '{self.model_name}' requires HuggingFace authorization.\n"
                    f"    1. Make sure you accepted access at: https://huggingface.co/{self.model_name}\n"
                    f"    2. Pass your token via '--hf_token hf_...' or set HF_TOKEN in your .env file,\n"
                    f"       or run 'huggingface-cli login' in terminal.\n"
                )
            raise e
        self.model.eval()

        if self.use_fp16:
            self.model = self.model.half()

        for param in self.model.parameters():
            param.requires_grad = False

    def load_audio(self, audio_path: str) -> Optional[np.ndarray]:
        """Loads audio file, converts to mono, resamples to target_sr, and clips/pads."""
        try:
            try:
                waveform, sr = sf.read(audio_path, dtype="float32")
            except Exception:
                waveform, sr = librosa.load(audio_path, sr=None, mono=True)

            if waveform.ndim > 1:
                waveform = np.mean(waveform, axis=1)

            if sr != self.target_sr:
                waveform = librosa.resample(waveform, orig_sr=sr, target_sr=self.target_sr)

            if len(waveform) > self.max_samples:
                waveform = waveform[: self.max_samples]
            elif len(waveform) < self.max_samples:
                waveform = np.pad(waveform, (0, self.max_samples - len(waveform)))

            return waveform
        except Exception as e:
            logger.warning(f"Failed to load audio {audio_path}: {e}")
            return None

    @torch.no_grad()
    def extract_batch(self, audio_batch: List[np.ndarray]) -> np.ndarray:
        """Runs a batch of audio waveforms through the model and applies temporal pooling."""
        inputs = self.processor(
            audio_batch,
            sampling_rate=self.target_sr,
            return_tensors="pt",
            padding=True,
        )

        input_values = inputs.input_values.to(self.device)
        if self.use_fp16:
            input_values = input_values.half()

        attention_mask = inputs.get("attention_mask")
        if attention_mask is not None:
            attention_mask = attention_mask.to(self.device)
            outputs = self.model(input_values, attention_mask=attention_mask)
        else:
            outputs = self.model(input_values)

        hidden_states = outputs.last_hidden_state  # shape: (B, T, 768)

        if self.pooling in ("stat", "mean_std"):
            # Statistical pooling: Concatenate Mean + Standard Deviation along time axis
            mean_pool = hidden_states.mean(dim=1)  # (B, 768)
            std_pool = hidden_states.std(dim=1)   # (B, 768)
            pooled = torch.cat([mean_pool, std_pool], dim=-1)  # (B, 1536)
        else:
            # Mean pooling only
            pooled = hidden_states.mean(dim=1)  # (B, 768)

        return pooled.float().cpu().numpy()


# ─────────────────────────────────────────────────────────────
# Dataset Ingestion & Balancing
# ─────────────────────────────────────────────────────────────
def parse_asvspoof_protocol(
    protocol_path: Path,
    audio_dir: Path,
    max_bonafide: Optional[int] = None,
    max_spoof: Optional[int] = None,
    random_seed: int = 42,
) -> List[Tuple[str, int]]:
    """
    Parses ASVspoof 2019 LA protocol file.
    Label mapping: 0 = bonafide (real), 1 = spoof (synthetic/cloned).
    """
    bonafide_items = []
    spoof_items = []

    with open(protocol_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            utt_id = parts[1]
            key = parts[4].lower()
            label = 0 if key == "bonafide" else 1

            flac_path = audio_dir / f"{utt_id}.flac"
            if flac_path.exists():
                if label == 0:
                    bonafide_items.append((str(flac_path), 0))
                else:
                    spoof_items.append((str(flac_path), 1))

    rng = random.Random(random_seed)
    rng.shuffle(bonafide_items)
    rng.shuffle(spoof_items)

    if max_bonafide is not None and max_bonafide > 0:
        bonafide_items = bonafide_items[:max_bonafide]
    if max_spoof is not None and max_spoof > 0:
        spoof_items = spoof_items[:max_spoof]

    records = bonafide_items + spoof_items
    rng.shuffle(records)
    return records


def sample_cv_hindi_clips(
    clips_dir: Path,
    max_samples: int = 500,
    random_seed: int = 42,
) -> List[Tuple[str, int]]:
    """
    Samples bonafide clips from Mozilla Common Voice Hindi dataset.
    All assigned label 0 (bonafide).
    """
    all_mp3s = list(clips_dir.glob("*.mp3"))
    if not all_mp3s:
        logger.warning(f"No .mp3 files found in {clips_dir}")
        return []

    rng = random.Random(random_seed)
    rng.shuffle(all_mp3s)
    selected = all_mp3s[:max_samples]
    return [(str(p), 0) for p in selected]


def extract_embeddings_for_records(
    records: List[Tuple[str, int]],
    extractor: Wav2VecFeatureExtractor,
    batch_size: int = 16,
    desc: str = "Extracting Features",
) -> Tuple[np.ndarray, np.ndarray]:
    """Processes a list of (audio_path, label) pairs in batches and returns X, y matrices."""
    X_list = []
    y_list = []

    for i in tqdm(range(0, len(records), batch_size), desc=desc):
        batch_records = records[i : i + batch_size]
        waveforms = []
        labels = []

        for path, label in batch_records:
            audio = extractor.load_audio(path)
            if audio is not None:
                waveforms.append(audio)
                labels.append(label)

        if not waveforms:
            continue

        embeddings = extractor.extract_batch(waveforms)
        X_list.append(embeddings)
        y_list.extend(labels)

    if not X_list:
        return np.empty((0, 0)), np.empty((0,))

    X = np.vstack(X_list)
    y = np.array(y_list, dtype=np.int64)
    return X, y


# ─────────────────────────────────────────────────────────────
# Evaluation & Equal Error Rate (EER) Helper
# ─────────────────────────────────────────────────────────────
def compute_eer(y_true: np.ndarray, y_score: np.ndarray) -> Tuple[float, float]:
    """
    Computes Equal Error Rate (EER) where False Acceptance Rate (FAR) == False Rejection Rate (FRR).
    Returns (eer_score, optimal_decision_threshold).
    """
    fpr, tpr, thresholds = roc_curve(y_true, y_score, pos_label=1)
    fnr = 1.0 - tpr
    idx = int(np.nanargmin(np.abs(fpr - fnr)))
    eer = float((fpr[idx] + fnr[idx]) / 2.0)
    best_threshold = float(thresholds[idx]) if idx < len(thresholds) else 0.50
    return eer, best_threshold


def print_evaluation_summary(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
    set_name: str = "Development",
):
    """Prints a detailed metrics report for binary anti-spoofing."""
    y_pred = (y_prob >= threshold).astype(int)
    eer, eer_threshold = compute_eer(y_true, y_prob)
    auc = roc_auc_score(y_true, y_prob)
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    print("\n" + "=" * 65)
    print(f"📊 {set_name.upper()} SET EVALUATION RESULTS")
    print("=" * 65)
    print(f"  • Total Samples:     {len(y_true)} (Bonafide: {np.sum(y_true == 0)}, Spoof: {np.sum(y_true == 1)})")
    print(f"  • ROC-AUC Score:     {auc:.4f}")
    print(f"  • Equal Error Rate:  {eer * 100:.2f}% (EER Threshold: {eer_threshold:.4f})")
    print(f"  • Accuracy (at {threshold:.2f}): {acc * 100:.2f}%")
    print(f"  • Precision:         {prec:.4f}")
    print(f"  • Recall:            {rec:.4f}")
    print(f"  • F1-Score:          {f1:.4f}")
    print("-" * 65)
    print(classification_report(y_true, y_pred, target_names=["Bonafide (0)", "Synthetic (1)"]))
    print("=" * 65 + "\n")


# ─────────────────────────────────────────────────────────────
# Classifier Builders
# ─────────────────────────────────────────────────────────────
def build_classifier(classifier_type: str = "lr", random_state: int = 42) -> Pipeline:
    """Builds a scikit-learn pipeline with scaling and the requested classifier."""
    ctype = classifier_type.lower()
    if ctype in ("lr", "logistic_regression", "logistic"):
        model = LogisticRegression(
            C=1.0,
            max_iter=1000,
            solver="lbfgs",
            class_weight="balanced",
            random_state=random_state,
        )
    elif ctype in ("svm", "rbf_svm"):
        model = SVC(
            C=1.0,
            kernel="rbf",
            probability=True,
            class_weight="balanced",
            random_state=random_state,
        )
    elif ctype in ("xgb", "xgboost"):
        model = XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=random_state,
        )
    elif ctype in ("ensemble", "voting"):
        lr = LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced", random_state=random_state)
        xgb = XGBClassifier(n_estimators=150, max_depth=4, learning_rate=0.05, eval_metric="logloss", random_state=random_state)
        model = VotingClassifier(
            estimators=[("lr", lr), ("xgb", xgb)],
            voting="soft",
        )
    else:
        raise ValueError(f"Unknown classifier type: '{classifier_type}'. Choose from lr, svm, xgb, ensemble.")

    return Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", model),
    ])


# ─────────────────────────────────────────────────────────────
# Main Training Routine
# ─────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="VoiceGuard Synthetic Voice Detection Training Pipeline")
    parser.add_argument("--asvspoof_dir", type=str, default=None, help="Root path to ASVspoof 2019 LA dataset")
    parser.add_argument("--cv_hindi_dir", type=str, default=None, help="Path to Mozilla Common Voice Hindi clips folder")
    parser.add_argument("--backbone", type=str, default="facebook/wav2vec2-base-960h", help="HuggingFace model backbone ID")
    parser.add_argument("--classifier", type=str, default="lr", choices=["lr", "svm", "xgb", "ensemble"], help="Downstream classifier")
    parser.add_argument("--pooling", type=str, default="stat", choices=["stat", "mean"], help="Pooling method (stat: Mean+Std -> 1536-dim, mean: 768-dim)")
    parser.add_argument("--batch_size", type=int, default=16, help="GPU feature extraction batch size")
    parser.add_argument("--max_duration", type=float, default=5.0, help="Audio duration cap in seconds")
    parser.add_argument("--n_cv_hindi", type=int, default=500, help="Number of Hindi Common Voice bonafide clips to mix into training")
    parser.add_argument("--subset", action="store_true", help="Use a balanced subset of ASVspoof for fast training")
    parser.add_argument("--n_train_per_class", type=int, default=1000, help="Samples per class when --subset is enabled")
    parser.add_argument("--n_dev_per_class", type=int, default=300, help="Dev samples per class when --subset is enabled")
    parser.add_argument("--hf_token", type=str, default=None, help="HuggingFace token for gated/private models (or set HF_TOKEN env var)")
    parser.add_argument("--cache_dir", type=str, default="./cache", help="Directory to cache extracted embeddings (.npz)")
    parser.add_argument("--no_cache", action="store_true", help="Disable caching / force re-extraction")
    parser.add_argument("--output_model", type=str, default="model.pkl", help="Path to save output model.pkl artifact")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")

    args = parser.parse_args()

    # Set seeds
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    print("=" * 65)
    print("🎙️🛡️ VOICEGUARD — SYNTHETIC VOICE CLASSIFIER TRAINING")
    print("=" * 65)

    # 1. Resolve Dataset Directories
    asv_root = resolve_asvspoof_dir(args.asvspoof_dir)
    logger.info(f"✅ ASVspoof 2019 LA Root: {asv_root}")

    train_protocol = asv_root / "ASVspoof2019_LA_cm_protocols" / "ASVspoof2019.LA.cm.train.trn.txt"
    train_audio_dir = asv_root / "ASVspoof2019_LA_train" / "flac"
    dev_protocol = asv_root / "ASVspoof2019_LA_cm_protocols" / "ASVspoof2019.LA.cm.dev.trl.txt"
    dev_audio_dir = asv_root / "ASVspoof2019_LA_dev" / "flac"

    cv_hindi_clips = resolve_cv_hindi_dir(args.cv_hindi_dir)
    if cv_hindi_clips:
        logger.info(f"✅ Mozilla Common Voice Hindi Clips: {cv_hindi_clips}")
    else:
        logger.info("ℹ️ No Mozilla Common Voice Hindi dataset found. Proceeding with ASVspoof only.")

    # 2. Check Embedding Cache (Unique tag for each backbone & dataset configuration)
    cache_path = Path(args.cache_dir)
    cache_path.mkdir(parents=True, exist_ok=True)
    backbone_slug = args.backbone.replace("/", "_").replace("-", "_")
    sub_tag = f"sub_tr{args.n_train_per_class}_dv{args.n_dev_per_class}" if args.subset else "full"
    hi_tag = f"hi{args.n_cv_hindi}" if (cv_hindi_clips and args.n_cv_hindi > 0) else "nohi"
    cache_tag = f"{backbone_slug}_{args.pooling}_{sub_tag}_{hi_tag}"
    train_cache_file = cache_path / f"X_train_{cache_tag}.npz"
    dev_cache_file = cache_path / f"X_dev_{cache_tag}.npz"

    X_train, y_train = None, None
    X_dev, y_dev = None, None

    if not args.no_cache and train_cache_file.exists() and dev_cache_file.exists():
        logger.info(f"⚡ Loading cached embeddings from {cache_path}...")
        logger.info(f"  Using cache tag: [{cache_tag}]")
        train_data = np.load(train_cache_file)
        X_train, y_train = train_data["X"], train_data["y"]
        dev_data = np.load(dev_cache_file)
        X_dev, y_dev = dev_data["X"], dev_data["y"]
        logger.info(f"  Loaded X_train: {X_train.shape}, y_train: {np.bincount(y_train)}")
        logger.info(f"  Loaded X_dev:   {X_dev.shape}, y_dev: {np.bincount(y_dev)}")
    else:
        # 3. Parse Records
        max_tr_bon = args.n_train_per_class if args.subset else None
        max_tr_spf = args.n_train_per_class if args.subset else None
        max_dv_bon = args.n_dev_per_class if args.subset else None
        max_dv_spf = args.n_dev_per_class if args.subset else None

        train_records = parse_asvspoof_protocol(train_protocol, train_audio_dir, max_tr_bon, max_tr_spf, args.seed)
        dev_records = parse_asvspoof_protocol(dev_protocol, dev_audio_dir, max_dv_bon, max_dv_spf, args.seed)

        # Mix in Mozilla Common Voice Hindi bonafide clips
        if cv_hindi_clips and args.n_cv_hindi > 0:
            cv_records = sample_cv_hindi_clips(cv_hindi_clips, max_samples=args.n_cv_hindi, random_seed=args.seed)
            logger.info(f"➕ Adding {len(cv_records)} Mozilla Common Voice Hindi bonafide clips to Training Set.")
            train_records.extend(cv_records)
            random.shuffle(train_records)

        logger.info(f"📋 Total Records to Process -> Train: {len(train_records)}, Dev: {len(dev_records)}")

        # 4. Initialize Feature Extractor & Run Extraction
        extractor = Wav2VecFeatureExtractor(
            model_name=args.backbone,
            target_sr=16000,
            max_duration=args.max_duration,
            pooling=args.pooling,
            hf_token=args.hf_token,
        )

        logger.info("Extracting embeddings for TRAINING set...")
        t0 = time.time()
        X_train, y_train = extract_embeddings_for_records(train_records, extractor, args.batch_size, "Train Embeddings")
        logger.info(f"Train extraction complete in {time.time() - t0:.1f}s -> Shape: {X_train.shape}")

        logger.info("Extracting embeddings for DEVELOPMENT set...")
        t0 = time.time()
        X_dev, y_dev = extract_embeddings_for_records(dev_records, extractor, args.batch_size, "Dev Embeddings")
        logger.info(f"Dev extraction complete in {time.time() - t0:.1f}s -> Shape: {X_dev.shape}")

        # Save Cache
        if not args.no_cache:
            np.savez_compressed(train_cache_file, X=X_train, y=y_train)
            np.savez_compressed(dev_cache_file, X=X_dev, y=y_dev)
            logger.info(f"💾 Embeddings cached to {train_cache_file.name} and {dev_cache_file.name}")

    # 5. Train Classifier Pipeline
    logger.info(f"🚀 Training downstream classifier: [{args.classifier.upper()}]...")
    pipeline = build_classifier(args.classifier, random_state=args.seed)

    t_train = time.time()
    pipeline.fit(X_train, y_train)
    logger.info(f"✅ Classifier trained in {time.time() - t_train:.2f}s")

    # 6. Evaluate on Development Set
    dev_probs = pipeline.predict_proba(X_dev)[:, 1]  # Probabilities of class 1 (SYNTHETIC)
    eer, eer_threshold = compute_eer(y_dev, dev_probs)
    auc = roc_auc_score(y_dev, dev_probs)

    print_evaluation_summary(y_dev, dev_probs, threshold=eer_threshold, set_name="Development")

    # 7. Serialize Artifact Bundle
    output_path = Path(args.output_model)
    script_dir = Path(__file__).resolve().parent
    models_dir = script_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    if not output_path.is_absolute():
        if str(output_path).startswith("models") or str(output_path).startswith("./models"):
            output_path = script_dir / output_path
        else:
            output_path = models_dir / output_path.name
    else:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    artifact_bundle: Dict[str, Any] = {
        "pipeline": pipeline,
        "backbone_name": args.backbone,
        "pooling": args.pooling,
        "target_sr": 16000,
        "max_duration": args.max_duration,
        "feature_dim": X_train.shape[1],
        "threshold": eer_threshold,
        "eer": eer,
        "auc": auc,
        "classifier_type": args.classifier,
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(output_path, "wb") as f:
        pickle.dump(artifact_bundle, f)

    logger.info(f"🎉 Model artifact successfully saved to: {output_path} ({output_path.stat().st_size / 1024:.1f} KB)")
    print(f"\n✅ Ready for inference with predict.py!")


if __name__ == "__main__":
    main()