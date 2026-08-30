# dsp.py
# TODO: Implement extract_dsp_features(audio_path: str) -> dict
#       - VAD via silero-vad to strip silence
#       - pitch/F0 variance     → pitch_variance     (low/medium/high)
#       - spectral centroid/rolloff anomaly → spectral_anomaly  (low/medium/high)
#       - phase spectrum irregularity → phase_irregularity (low/medium/high)
#       - pause/timing pattern  → timing_pattern     (low/medium/high)
#       Uses librosa and/or parselmouth