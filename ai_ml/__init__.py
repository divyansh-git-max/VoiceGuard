"""
VoiceGuard AI/ML Package
========================
Provides synthetic voice detection classifier models and DSP forensic feature extractors.
"""

import sys
import types
import importlib.machinery

# Windows Compatibility Guard: safe torchaudio stub prevents WinError 127 in torchaudio DLL while allowing imports
if "torchaudio" not in sys.modules or sys.modules["torchaudio"] is None:
    _ta = types.ModuleType("torchaudio")
    _ta.__version__ = "2.2.0"
    _ta.__spec__ = importlib.machinery.ModuleSpec(name="torchaudio", loader=None)
    sys.modules["torchaudio"] = _ta
