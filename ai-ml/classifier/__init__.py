"""
VoiceGuard Classifier Package
Exposes core prediction API for downstream backend services.
"""

# pyrefly: ignore [missing-import]
from .predict import predict, predict_detailed, VoiceGuardModelManager

__all__ = ["predict", "predict_detailed", "VoiceGuardModelManager"]