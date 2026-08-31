#!/usr/bin/env python3
"""
VoiceGuard Classifier Inference Module
=======================================
Provides high-performance inference for synthetic/cloned voice detection.

API Contract:
    predict(audio_path: str) -> float
    Returns a probability score between 0.0 (bonafide) and 1.0 (synthetic/cloned).

Also provides:
    predict_detailed(audio_path: str) -> dict
    Returns comprehensive prediction metadata including confidence and verdict.
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

import pickle
import logging
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, Union

import numpy as np
import torch
import soundfile as sf
import librosa
from transformers import AutoFeatureExtractor, AutoModel

from dotenv import load_dotenv
load_dotenv()

# Silence noisy third-party network loggers during inference
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
import transformers
transformers.logging.set_verbosity_error()

# ─────────────────────────────────────────────────────────────
# Logging Configuration
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("VoiceGuard-Predict")


# ─────────────────────────────────────────────────────────────
# Global Model Manager (Singleton for Zero-Overhead Inference)
# ─────────────────────────────────────────────────────────────
class VoiceGuardModelManager:
    """
    Manages lazy loading and caching of the pretrained backbone and
    downstream classification head. Ensures models are loaded only once in memory.
    """

    _instance: Optional["VoiceGuardModelManager"] = None

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = self._resolve_model_path(model_path)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.use_fp16 = torch.cuda.is_available()
        self.hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")

        self.classifier_bundle: Optional[Dict[str, Any]] = None
        self.pipeline = None
        self.backbone_name = "facebook/wav2vec2-base-960h"
        self.pooling = "stat"
        self.target_sr = 16000
        self.max_duration = 5.0
        self.threshold = 0.50

        self.feature_extractor = None
        self.backbone_model = None
        self._is_loaded = False

    @classmethod
    def get_instance(cls, model_path: Optional[str] = None) -> "VoiceGuardModelManager":
        if cls._instance is None:
            cls._instance = VoiceGuardModelManager(model_path)
        return cls._instance

    def _resolve_model_path(self, model_path: Optional[str]) -> Path:
        """Resolves the location of the trained model artifact."""
        candidates = []
        script_dir = Path(__file__).resolve().parent
        models_dir = script_dir / "models"

        if model_path:
            p = Path(model_path)
            candidates.extend([
                p,
                models_dir / p.name,
                script_dir / p.name,
                Path("./models") / p.name,
                Path("./ai-ml/classifier/models") / p.name,
            ])

        # Priority 1: models/ subdirectory
        candidates.extend([
            models_dir / "model.pkl",
            models_dir / "model_ai4bharat.pkl",
            models_dir / "model_facebook.pkl",
        ])

        # Priority 2: classifier/ root directory
        candidates.extend([
            script_dir / "model.pkl",
            script_dir / "model_ai4bharat.pkl",
            script_dir / "model_facebook.pkl",
            Path("./models/model.pkl"),
            Path("./ai-ml/classifier/models/model.pkl"),
            Path("./ai-ml/classifier/model.pkl"),
        ])

        for path in candidates:
            if path.exists() and path.is_file():
                return path

        # Default fallback path
        return models_dir / "model.pkl"

    def load(self, force_reload: bool = False):
        """Loads model artifact and transformer backbone into memory."""
        if self._is_loaded and not force_reload:
            return

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Trained model artifact not found at '{self.model_path}'. "
                f"Please run 'python ai-ml/classifier/train.py' first to generate model.pkl."
            )

        logger.info(f"Loading VoiceGuard classifier from {self.model_path}...")
        with open(self.model_path, "rb") as f:
            artifact = pickle.load(f)

        if isinstance(artifact, dict) and "pipeline" in artifact:
            # Full bundle format
            self.classifier_bundle = artifact
            self.pipeline = artifact["pipeline"]
            self.backbone_name = artifact.get("backbone_name", "facebook/wav2vec2-base-960h")
            self.pooling = artifact.get("pooling", "stat").lower()
            self.target_sr = artifact.get("target_sr", 16000)
            self.max_duration = artifact.get("max_duration", 5.0)
            self.threshold = artifact.get("threshold", 0.50)
        else:
            # Raw scikit-learn pipeline fallback
            self.pipeline = artifact
            self.classifier_bundle = None
            self.backbone_name = "facebook/wav2vec2-base-960h"
            self.pooling = "stat"
            self.target_sr = 16000
            self.max_duration = 5.0
            self.threshold = 0.50

        logger.info(f"  Backbone:  {self.backbone_name}")
        logger.info(f"  Pooling:   {self.pooling}")
        logger.info(f"  Threshold: {self.threshold:.4f}")
        logger.info(f"  Device:    {self.device}")

        logger.info(f"Loading transformer backbone: {self.backbone_name}...")
        try:
            try:
                self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.backbone_name, local_files_only=True)
                self.backbone_model = AutoModel.from_pretrained(self.backbone_name, local_files_only=True).to(self.device)
            except Exception:
                self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.backbone_name, token=self.hf_token)
                self.backbone_model = AutoModel.from_pretrained(self.backbone_name, token=self.hf_token).to(self.device)
        except Exception as e:
            if "gated" in str(e).lower() or "401" in str(e):
                logger.error(
                    f"\n[!] Model '{self.backbone_name}' is gated or private on HuggingFace.\n"
                    f"    Please authenticate via 'huggingface-cli login' or set HF_TOKEN in your .env file.\n"
                )
            raise e
        self.backbone_model.eval()

        if self.use_fp16:
            self.backbone_model = self.backbone_model.half()

        for param in self.backbone_model.parameters():
            param.requires_grad = False

        self._is_loaded = True
        logger.info("✅ VoiceGuard inference engine initialized.")

    def preprocess_audio(self, audio_path: Union[str, Path]) -> np.ndarray:
        """Loads audio, ensures mono, resamples to 16kHz, and pads/clips to standard duration."""
        audio_path_str = str(audio_path)
        if not os.path.exists(audio_path_str):
            raise FileNotFoundError(f"Audio file not found: {audio_path_str}")

        try:
            try:
                waveform, sr = sf.read(audio_path_str, dtype="float32")
            except Exception:
                waveform, sr = librosa.load(audio_path_str, sr=None, mono=True)

            if waveform.ndim > 1:
                waveform = np.mean(waveform, axis=1)

            if sr != self.target_sr:
                waveform = librosa.resample(waveform, orig_sr=sr, target_sr=self.target_sr)

            max_samples = int(self.target_sr * self.max_duration)
            if len(waveform) > max_samples:
                waveform = waveform[:max_samples]
            elif len(waveform) < max_samples:
                waveform = np.pad(waveform, (0, max_samples - len(waveform)))

            return waveform.astype(np.float32)
        except Exception as e:
            raise RuntimeError(f"Error reading or processing audio '{audio_path_str}': {e}")

    @torch.no_grad()
    def extract_embedding(self, waveform: np.ndarray) -> np.ndarray:
        """Extracts 768-dim or 1536-dim embedding vector from audio waveform."""
        inputs = self.feature_extractor(
            [waveform],
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
            outputs = self.backbone_model(input_values, attention_mask=attention_mask)
        else:
            outputs = self.backbone_model(input_values)

        hidden_states = outputs.last_hidden_state  # shape: (1, T, 768)

        if self.pooling in ("stat", "mean_std"):
            mean_pool = hidden_states.mean(dim=1)  # (1, 768)
            std_pool = hidden_states.std(dim=1)   # (1, 768)
            pooled = torch.cat([mean_pool, std_pool], dim=-1)  # (1, 1536)
        else:
            pooled = hidden_states.mean(dim=1)  # (1, 768)

        return pooled.float().cpu().numpy()

    def predict_proba(self, audio_path: Union[str, Path]) -> float:
        """Returns synthetic probability for single audio file (0.0 to 1.0)."""
        self.load()
        waveform = self.preprocess_audio(audio_path)
        embedding = self.extract_embedding(waveform)  # (1, D)
        prob = float(self.pipeline.predict_proba(embedding)[0, 1])
        return prob

    def predict_detailed(self, audio_path: Union[str, Path]) -> Dict[str, Any]:
        """Returns structured prediction details for single audio file."""
        prob = self.predict_proba(audio_path)
        is_synthetic = bool(prob >= self.threshold)
        label = "SYNTHETIC" if is_synthetic else "BONAFIDE"

        # Calculate confidence as distance from decision boundary
        if is_synthetic:
            confidence = (prob - self.threshold) / (1.0 - self.threshold) if self.threshold < 1.0 else 1.0
        else:
            confidence = (self.threshold - prob) / self.threshold if self.threshold > 0.0 else 1.0
        confidence = float(np.clip(confidence, 0.0, 1.0))

        return {
            "authenticity_score": round(prob, 4),
            "is_synthetic": is_synthetic,
            "label": label,
            "confidence": round(confidence, 4),
            "threshold": round(self.threshold, 4),
            "backbone": self.backbone_name,
            "pooling": self.pooling,
            "device": str(self.device),
        }


# ─────────────────────────────────────────────────────────────
# Primary Public API Functions
# ─────────────────────────────────────────────────────────────
def predict(audio_path: str) -> float:
    """
    Predicts the probability that the given audio is SYNTHETIC (cloned/spoofed).

    Args:
        audio_path: Path to the audio file (.flac, .wav, .mp3, etc.)

    Returns:
        float: Probability in [0.0, 1.0] where higher means more likely SYNTHETIC.
    """
    manager = VoiceGuardModelManager.get_instance()
    return manager.predict_proba(audio_path)


def predict_detailed(audio_path: str) -> Dict[str, Any]:
    """
    Returns full structured prediction metadata for an audio file.

    Args:
        audio_path: Path to the audio file.

    Returns:
        dict: Containing authenticity_score, is_synthetic, label, confidence, etc.
    """
    manager = VoiceGuardModelManager.get_instance()
    return manager.predict_detailed(audio_path)


# ─────────────────────────────────────────────────────────────
# CLI Execution Support
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VoiceGuard Synthetic Voice Prediction")
    parser.add_argument("audio", nargs="?", type=str, help="Path to audio file for prediction")
    parser.add_argument("--model", type=str, default=None, help="Path to model.pkl artifact")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")

    args = parser.parse_args()

    if not args.audio:
        print("Usage: python predict.py <path_to_audio_file> [--json]")
        sys.exit(1)

    try:
        manager = VoiceGuardModelManager.get_instance(args.model)
        result = manager.predict_detailed(args.audio)

        if args.json:
            import json
            print(json.dumps(result, indent=2))
        else:
            print("\n" + "=" * 55)
            print("🎙️🛡️ VOICEGUARD AUDIO ANALYSIS VERDICT")
            print("=" * 55)
            print(f"  • File:               {args.audio}")
            print(f"  • Verdict:            {result['label']}")
            print(f"  • Synthetic Prob:     {result['authenticity_score'] * 100:.2f}% (score: {result['authenticity_score']})")
            print(f"  • Decision Threshold: {result['threshold']}")
            print(f"  • Model Confidence:   {result['confidence'] * 100:.1f}%")
            print(f"  • Backbone:           {result['backbone']}")
            print("=" * 55 + "\n")
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        sys.exit(1)