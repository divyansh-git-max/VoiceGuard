# analyze.py
# TODO: POST /analyze endpoint
#       1. Accept UploadFile (audio)
#       2. Save to temp file
#       3. Call classifier.predict(audio_path) → authenticity_score
#       4. Call dsp.extract_dsp_features(audio_path) → dsp_output dict
#       5. Accept optional JSON body fields: transaction_type, caller_id_match
#       6. Pass all evidence to llm_judge.judge()
#       7. Return final JSON matching shared/schema.json shape
