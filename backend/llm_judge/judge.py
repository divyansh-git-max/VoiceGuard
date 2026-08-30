# judge.py
# TODO: Implement judge(evidence: dict) -> dict
#       - evidence = { authenticity_score, dsp_output, context }
#       - Build a structured prompt for gpt-4o-mini
#       - Call OpenAI API (key from .env via python-dotenv)
#       - Parse response into { final_risk_score, risk_level, explanation }
#       - NOTE: LLM receives ONLY the structured evidence dict, never raw audio
