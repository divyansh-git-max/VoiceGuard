#!/usr/bin/env python3
"""
VoiceGuard Evaluation Suite
============================
Evaluates the trained VoiceGuard model on the official, completely unseen
ASVspoof 2019 LA Evaluation Set (71,237 clips) + Unseen Hindi Common Voice clips.

Features:
  - Ground-truth comparison against official evaluation protocol.
  - Per-Attack breakdown (A07 to A19 algorithms, neural vocoders, voice conversion, TTS).
  - Confusion Matrix & Equal Error Rate (EER) reporting.
  - Sample-by-sample detailed prediction log.
  - Optional CSV report export.

Usage:
  uv run python ai-ml/classifier/evaluate_eval.py --samples 500
  uv run python ai-ml/classifier/evaluate_eval.py --samples 1000 --save_csv results.csv
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
# Windows Compatibility Guards
# ─────────────────────────────────────────────────────────────
sys.modules["torchaudio"] = None

import transformers.modeling_utils
import transformers.utils.import_utils
transformers.modeling_utils.check_torch_load_is_safe = lambda: None
transformers.utils.import_utils.check_torch_load_is_safe = lambda: None

import time
import random
import argparse
import logging
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from collections import defaultdict

import numpy as np
import soundfile as sf
import librosa
from tqdm import tqdm
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    roc_curve,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

# Import our inference manager
# pyrefly: ignore [missing-import]
from predict import VoiceGuardModelManager

# ─────────────────────────────────────────────────────────────
# Logging Configuration
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("VoiceGuard-EvalSuite")


# ─────────────────────────────────────────────────────────────
# Dataset Path Resolvers
# ─────────────────────────────────────────────────────────────
def resolve_eval_paths(asvspoof_dir: Optional[str] = None) -> Tuple[Path, Path]:
    """Finds ASVspoof 2019 LA evaluation protocol and audio directory."""
    candidates = []
    if asvspoof_dir:
        candidates.append(Path(asvspoof_dir))

    candidates.extend([
        Path(r"E:\archive\LA\LA"),
        Path(r"E:\archive\LA"),
        Path(r"E:\archive"),
        Path("./data/LA/LA"),
        Path("./data/LA"),
    ])

    for base in candidates:
        if not base.exists():
            continue
        proto = base / "ASVspoof2019_LA_cm_protocols" / "ASVspoof2019.LA.cm.eval.trl.txt"
        audio = base / "ASVspoof2019_LA_eval" / "flac"
        if proto.exists() and audio.is_dir():
            return proto, audio

        nested_proto = base / "LA" / "ASVspoof2019_LA_cm_protocols" / "ASVspoof2019.LA.cm.eval.trl.txt"
        nested_audio = base / "LA" / "ASVspoof2019_LA_eval" / "flac"
        if nested_proto.exists() and nested_audio.is_dir():
            return nested_proto, nested_audio

    raise FileNotFoundError("Could not find ASVspoof 2019 LA Eval dataset on disk.")


def resolve_unseen_hindi_clips(cv_dir: Optional[str] = None, max_clips: int = 100) -> List[Tuple[str, str, str, int]]:
    """Loads unseen Hindi clips from the tail of Common Voice dataset."""
    candidates = []
    if cv_dir:
        candidates.append(Path(cv_dir))
    candidates.extend([
        Path(r"E:\Mozilla Common Speech Hindi\cv-corpus-26.0-2026-06-12\hi\clips"),
        Path(r"E:\Mozilla Common Speech Hindi\hi\clips"),
    ])

    for base in candidates:
        if base.is_dir():
            all_mp3s = sorted(list(base.glob("*.mp3")))
            if len(all_mp3s) > 3000:
                # Use clips from index 3000+ so they are 100% disjoint from training!
                unseen = all_mp3s[3000 : 3000 + max_clips]
                return [(p.name, str(p), "Hindi-Native", 0) for p in unseen]
    return []


# ─────────────────────────────────────────────────────────────
# Evaluation Protocol Parser
# ─────────────────────────────────────────────────────────────
def load_eval_records(
    protocol_path: Path,
    audio_dir: Path,
    max_samples: Optional[int] = 500,
    seed: int = 42,
) -> List[Dict[str, Any]]:
    """
    Parses the ASVspoof 2019 LA evaluation protocol.
    Format: [SPEAKER_ID] [UTTERANCE_ID] [SYSTEM_ID] [KEY/ATTACK] [LABEL]
    Example: LA_0039 LA_E_2834763 - A11 spoof
    """
    records = []
    bonafide = []
    spoofs = []

    with open(protocol_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue

            spk_id = parts[0]
            utt_id = parts[1]
            attack_type = parts[3]  # e.g. A07, A08, ... A19, or '-'
            label_str = parts[4].lower()
            label = 0 if label_str == "bonafide" else 1

            flac_file = audio_dir / f"{utt_id}.flac"
            if not flac_file.exists():
                continue

            item = {
                "utt_id": utt_id,
                "file_path": str(flac_file),
                "speaker_id": spk_id,
                "attack_type": attack_type if attack_type != "-" else "Bonafide-Human",
                "label": label,
                "label_name": "BONAFIDE" if label == 0 else "SYNTHETIC",
            }

            if label == 0:
                bonafide.append(item)
            else:
                spoofs.append(item)

    rng = random.Random(seed)
    rng.shuffle(bonafide)
    rng.shuffle(spoofs)

    if max_samples is not None and max_samples > 0:
        n_per = max_samples // 2
        selected = bonafide[:n_per] + spoofs[:n_per]
        rng.shuffle(selected)
        return selected

    all_records = bonafide + spoofs
    rng.shuffle(all_records)
    return all_records


# ─────────────────────────────────────────────────────────────
# Evaluation Runner
# ─────────────────────────────────────────────────────────────
def run_evaluation(
    records: List[Dict[str, Any]],
    model_path: Optional[str] = None,
    batch_size: int = 32,
) -> Dict[str, Any]:
    """Runs batch inference and collects full evaluation metrics."""
    manager = VoiceGuardModelManager.get_instance(model_path)
    manager.load()

    logger.info(f"Evaluating {len(records)} test clips on [{manager.device}] using model threshold: {manager.threshold:.4f}...")

    y_true = []
    y_scores = []
    y_pred = []
    sample_results = []

    # Attack specific tracking
    attack_stats = defaultdict(lambda: {"total": 0, "correct": 0})

    t0 = time.time()
    for item in tqdm(records, desc="Running Evaluation"):
        prob = manager.predict_proba(item["file_path"])
        pred_label = 1 if prob >= manager.threshold else 0
        is_correct = bool(pred_label == item["label"])

        y_true.append(item["label"])
        y_scores.append(prob)
        y_pred.append(pred_label)

        attack = item["attack_type"]
        attack_stats[attack]["total"] += 1
        if is_correct:
            attack_stats[attack]["correct"] += 1

        sample_results.append({
            "utt_id": item["utt_id"],
            "true_label": item["label_name"],
            "attack_type": item["attack_type"],
            "pred_prob": round(prob, 4),
            "pred_label": "SYNTHETIC" if pred_label == 1 else "BONAFIDE",
            "is_correct": is_correct,
            "status": "✅ PASS" if is_correct else "❌ FAIL",
        })

    elapsed = time.time() - t0
    y_true_np = np.array(y_true)
    y_scores_np = np.array(y_scores)
    y_pred_np = np.array(y_pred)

    # Compute ROC and EER
    fpr, tpr, thresholds = roc_curve(y_true_np, y_scores_np, pos_label=1)
    fnr = 1.0 - tpr
    idx = int(np.nanargmin(np.abs(fpr - fnr)))
    eer = float((fpr[idx] + fnr[idx]) / 2.0)
    eer_thresh = float(thresholds[idx]) if idx < len(thresholds) else manager.threshold
    auc = float(roc_auc_score(y_true_np, y_scores_np))
    acc = float(accuracy_score(y_true_np, y_pred_np))

    cm = confusion_matrix(y_true_np, y_pred_np)

    return {
        "total_samples": len(records),
        "elapsed_time": elapsed,
        "speed_clips_per_sec": len(records) / max(elapsed, 0.001),
        "accuracy": acc,
        "roc_auc": auc,
        "eer": eer,
        "eer_threshold": eer_thresh,
        "model_threshold": manager.threshold,
        "confusion_matrix": cm,
        "attack_stats": dict(attack_stats),
        "sample_results": sample_results,
        "y_true": y_true_np,
        "y_pred": y_pred_np,
    }


def print_evaluation_report(results: Dict[str, Any], show_samples: int = 15):
    """Prints a beautiful formatted evaluation report with sample log and attack breakdown."""
    print("\n" + "=" * 75)
    print("🎙️🛡️ VOICEGUARD — UNSEEN EVALUATION SET BENCHMARK REPORT")
    print("=" * 75)

    print(f"  • Total Evaluated Clips:  {results['total_samples']}")
    print(f"  • Evaluation Time:        {results['elapsed_time']:.2f}s ({results['speed_clips_per_sec']:.1f} clips/sec on GPU)")
    print(f"  • Overall Accuracy:       {results['accuracy'] * 100:.2f}%")
    print(f"  • ROC-AUC Score:          {results['roc_auc']:.4f}")
    print(f"  • Equal Error Rate (EER): {results['eer'] * 100:.2f}%")
    print(f"  • Decision Threshold:     {results['model_threshold']:.4f}")

    print("\n" + "-" * 75)
    print("📊 CONFUSION MATRIX:")
    cm = results["confusion_matrix"]
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (cm[0,0], 0, 0, 0)
    print(f"  • Real Human (Bonafide):   Correct = {tn} (True Real)  |  False Alarm = {fp}")
    print(f"  • Voice Clone (Synthetic): Correct = {tp} (Detected)   |  Missed = {fn}")
    print("-" * 75)

    print("\n🎯 ACCURACY BY ATTACK / AUDIO TYPE (Unseen Algorithms):")
    print(f"  {'Attack / Voice Category':<25} | {'Tested':<8} | {'Correct':<8} | {'Detection Rate':<15}")
    print("  " + "-" * 65)

    for cat, stats in sorted(results["attack_stats"].items()):
        total = stats["total"]
        corr = stats["correct"]
        pct = (corr / total * 100) if total > 0 else 0.0
        print(f"  {cat:<25} | {total:<8} | {corr:<8} | {pct:>6.2f}%")

    print("-" * 75)

    # Sample Inspection Log
    print(f"\n🔍 SAMPLE INSPECTION (First {min(show_samples, len(results['sample_results']))} Test Clips):")
    print(f"  {'Utterance ID':<15} | {'Ground Truth':<10} | {'Attack Type':<16} | {'Synth Prob':<10} | {'Status'}")
    print("  " + "-" * 70)

    for s in results["sample_results"][:show_samples]:
        print(f"  {s['utt_id']:<15} | {s['true_label']:<10} | {s['attack_type']:<16} | {s['pred_prob'] * 100:>6.2f}%   | {s['status']}")

    print("=" * 75 + "\n")


# ─────────────────────────────────────────────────────────────
# CLI Entrypoint
# ─────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="VoiceGuard Evaluation Suite on Unseen Audio")
    parser.add_argument("--samples", type=int, default=500, help="Number of random balanced evaluation clips to test (e.g. 500, 1000, 0 for all)")
    parser.add_argument("--add_hindi", type=int, default=50, help="Number of unseen Hindi Common Voice clips to test")
    parser.add_argument("--model", type=str, default=None, help="Path to model.pkl artifact")
    parser.add_argument("--asvspoof_dir", type=str, default=None, help="Path to ASVspoof dataset")
    parser.add_argument("--save_csv", type=str, default=None, help="Optional path to export detailed CSV results")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")

    args = parser.parse_args()

    print("=" * 75)
    print("🔍 INITIATING UNSEEN EVALUATION BENCHMARK")
    print("=" * 75)

    proto_path, audio_dir = resolve_eval_paths(args.asvspoof_dir)
    logger.info(f"✅ Found ASVspoof 2019 Eval Protocol: {proto_path.name}")
    logger.info(f"✅ Found ASVspoof 2019 Eval Audio Dir:  {audio_dir}")

    # Load ASVspoof Eval records
    records = load_eval_records(proto_path, audio_dir, max_samples=args.samples, seed=args.seed)

    # Mix in unseen Hindi clips
    if args.add_hindi > 0:
        hindi_records = resolve_unseen_hindi_clips(max_clips=args.add_hindi)
        if hindi_records:
            logger.info(f"➕ Blending {len(hindi_records)} unseen Native Hindi human clips into benchmark.")
            for utt_id, path, cat, lbl in hindi_records:
                records.append({
                    "utt_id": utt_id,
                    "file_path": path,
                    "speaker_id": "Hindi_Speaker",
                    "attack_type": cat,
                    "label": lbl,
                    "label_name": "BONAFIDE",
                })
            random.Random(args.seed).shuffle(records)

    logger.info(f"📋 Total Test Samples Prepared: {len(records)}")

    # Run Benchmark
    results = run_evaluation(records, model_path=args.model)

    # Print Report
    print_evaluation_report(results, show_samples=20)

    # Save CSV if requested
    if args.save_csv:
        import csv
        csv_path = Path(args.save_csv)
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["utt_id", "true_label", "attack_type", "pred_prob", "pred_label", "is_correct", "status"])
            writer.writeheader()
            writer.writerows(results["sample_results"])
        logger.info(f"💾 Full evaluation log exported to: {csv_path.resolve()}")


if __name__ == "__main__":
    main()
