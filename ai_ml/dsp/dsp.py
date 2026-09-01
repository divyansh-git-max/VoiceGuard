# dsp.py
# TODO: Implement extract_dsp_features(audio_path: str) -> dict
#       - VAD via silero-vad to strip silence
#       - pitch/F0 variance     → pitch_variance     (low/medium/high)
#       - spectral centroid/rolloff anomaly → spectral_anomaly  (low/medium/high)
#       - phase spectrum irregularity → phase_irregularity (low/medium/high)
#       - pause/timing pattern  → timing_pattern     (low/medium/high)
#       Uses librosa and/or parselmouth

from pathlib import Path
import numpy as np
import librosa

# pyrefly: ignore [missing-import]
import parselmouth
import torch

from silero_vad import (
    get_speech_timestamps,
    load_silero_vad,
)


SAMPLE_RATE = 16000


def _load_audio(audio_path: str):
    """Load audio as mono at 16 kHz."""

    path = Path(audio_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )

    y, sr = librosa.load(
        audio_path,
        sr=SAMPLE_RATE,
        mono=True
    )

    if len(y) == 0:
        raise ValueError(
            "Audio file contains no samples."
        )

    return y, sr


def _get_speech_segments(y, sr):
    """
    Use Silero VAD to find speech segments.

    Returns a list of dictionaries containing
    start and end sample positions.
    """

    if sr != SAMPLE_RATE:
        raise ValueError(
            f"Expected {SAMPLE_RATE} Hz audio."
        )

    model = load_silero_vad()

    audio_tensor = torch.from_numpy(
        y.astype(np.float32)
    )

    speech_segments = get_speech_timestamps(
        audio_tensor,
        model,
        sampling_rate=sr
    )

    return speech_segments

def _collect_speech_audio(y, speech_segments):
    """
    Join all detected speech segments into one
    continuous speech-only waveform.
    """

    if not speech_segments:
        return np.array([], dtype=np.float32)

    speech_chunks = []

    for segment in speech_segments:
        start = segment["start"]
        end = segment["end"]

        speech_chunks.append(
            y[start:end]
        )

    return np.concatenate(speech_chunks)





def _level(value, low_threshold, high_threshold):
    """Convert numeric value ---- low/medium/high."""

    if value < low_threshold:
        return "low"

    if value < high_threshold:
        return "medium"

    return "high"


def _analyze_pitch(y, sr):
    """Analyze pitch/F0 variability in speech"""

    if len(y) == 0:
        return "high"

    f0, _, _ = librosa.pyin(
        y,
        fmin=50,
        fmax=500,
        sr=sr
    )

    valid_f0 = f0[~np.isnan(f0)]

    if len(valid_f0) < 5:
        return "high"

    mean_f0 = np.mean(valid_f0)

    if mean_f0 <= 0:
        return "high"

    pitch_variation = float(
        np.std(valid_f0) / mean_f0
    )

    return _level(
        pitch_variation,
        0.08,
        0.20
    )


def _analyze_spectral(y, sr):
    """Analyze spectral centroid and rolloff."""

    if len(y) == 0:
        return "high"

    centroid = librosa.feature.spectral_centroid(
        y=y,
        sr=sr
    )[0]

    rolloff = librosa.feature.spectral_rolloff(
        y=y,
        sr=sr
    )[0]

    centroid_cv = (
        np.std(centroid)
        / max(np.mean(centroid), 1e-6)
    )

    rolloff_cv = (
        np.std(rolloff)
        / max(np.mean(rolloff), 1e-6)
    )

    spectral_score = float(
        (centroid_cv + rolloff_cv) / 2
    )

    return _level(
        spectral_score,
        0.15,
        0.35
    )


def _analyze_phase(y):
    """Analyze frame-to-frame phase irregularity."""

    if len(y) == 0:
        return "high"

    stft = librosa.stft(y)

    if stft.shape[1] < 2:
        return "high"

    phase = np.angle(stft)

    phase_diff = np.diff(
        phase,
        axis=1
    )

    phase_diff = np.angle(
        np.exp(1j * phase_diff)
    )

    irregularity = float(
        np.std(phase_diff)
    )

    return _level(
        irregularity,
        1.0,
        2.0
    )


def _analyze_timing(speech_segments, sr):
    """ Analyze pauses between Silero VAD speech segments """

    if len(speech_segments) < 2:
        return "low"

    pauses = []

    for i in range(
        len(speech_segments) - 1
    ):

        current_end = (
            speech_segments[i]["end"]
        )

        next_start = (
            speech_segments[i + 1]["start"]
        )

        pause_duration = (
            next_start - current_end
        ) / sr

        if pause_duration >= 0:
            pauses.append(
                pause_duration
            )

    if not pauses:
        return "low"

    pauses = np.array(pauses)

    timing_score = float(
        np.mean(pauses)
        + np.std(pauses)
    )

    return _level(
        timing_score,
        0.30,
        0.80
    )


def extract_dsp_features(
    audio_path: str
) -> dict:
    """
    Extract all required DSP features. Silero VAD first detects speech. Pitch, spectral, and phase features are
    calculated only from detected speech.Timing features are calculated from the gaps between speech segments  """

    y, sr = _load_audio(
        audio_path
    )

    speech_segments = _get_speech_segments(
        y,
        sr
    )

    speech_audio = _collect_speech_audio(
        y,
        speech_segments
    )

    return {
        "pitch_variance": _analyze_pitch(
            speech_audio,
            sr
        ),

        "spectral_anomaly": _analyze_spectral(
            speech_audio,
            sr
        ),

        "phase_irregularity": _analyze_phase(
            speech_audio
        ),

        "timing_pattern": _analyze_timing(
            speech_segments,
            sr
        ),
    }
    