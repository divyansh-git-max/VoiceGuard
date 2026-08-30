# ============================================================
# backend/llm_judge/judge.py
# Role: LLM-based risk verdict with rule-based fallback.
# Pipeline position: Called by routes/analyze.py after classifier
#   and DSP modules have run. Produces the final human-readable verdict.
#
# Priority order for LLM backend:
#   1. OpenAI  (OPENAI_API_KEY in .env)
#   2. Groq    (GROQ_API_KEY in .env)  — free tier, fast, same SDK
#   3. Rule-based fallback             — no API key needed, always works
# ============================================================

import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

# ── LLM prompt ───────────────────────────────────────────────
# The LLM receives ONLY structured evidence — never raw audio.
SYSTEM_PROMPT = """You are a voice-fraud risk analyst.
You will receive structured evidence from an AI voice-clone detection pipeline.
Your job is to assess whether the evidence is internally consistent and 
produce a final risk verdict.

Respond ONLY with valid JSON in this exact shape:
{
  "final_risk_score": <integer 0-100>,
  "risk_level": "<low|medium|high>",
  "explanation": "<2-3 sentence plain-language verdict>"
}

Guidelines:
- final_risk_score >= 70 → risk_level must be "high"
- final_risk_score 40-69 → risk_level must be "medium"  
- final_risk_score < 40  → risk_level must be "low"
- Mention the most important evidence signal in the explanation.
- Keep explanation short — it will be shown to a security analyst in real time."""

def _build_user_prompt(evidence: dict) -> str:
    """Format the evidence dict into a clear prompt for the LLM."""
    return f"""Voice clone detection evidence:

Classifier result:
  - Spoof probability: {evidence['authenticity_score']:.2%}

DSP feature flags:
  - Pitch variance:      {evidence['dsp_output']['pitch_variance']}
  - Spectral anomaly:    {evidence['dsp_output']['spectral_anomaly']}
  - Phase irregularity:  {evidence['dsp_output']['phase_irregularity']}
  - Timing pattern:      {evidence['dsp_output']['timing_pattern']}

Call context:
  - Transaction type:    {evidence['context']['transaction_type']}
  - Caller ID match:     {evidence['context']['caller_id_match']}

Assess the overall risk and respond with JSON only."""


# ── Fallback: rule-based verdict (no API key needed) ─────────

def _rule_based_verdict(evidence: dict) -> dict:
    """
    Deterministic fallback when no LLM API key is available.
    Combines classifier score (70% weight) + DSP high-flag count (30% weight).
    Always returns the same schema shape as the LLM path.
    """
    authenticity_score = evidence["authenticity_score"]
    dsp = evidence["dsp_output"]

    high_flags = sum(1 for v in dsp.values() if v == "high")
    dsp_score = (high_flags / 4) * 100     # 4 DSP flags, each worth 25 pts

    final_score = int(0.7 * authenticity_score * 100 + 0.3 * dsp_score)
    final_score = max(0, min(100, final_score))  # clamp to [0, 100]

    if final_score >= 70:
        risk_level = "high"
    elif final_score >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "final_risk_score": final_score,
        "risk_level": risk_level,
        "explanation": (
            f"[Rule-based mode — no LLM API key] "
            f"Classifier flagged {authenticity_score:.0%} spoof probability. "
            f"{high_flags}/4 DSP indicators are elevated. "
            f"Overall risk assessed as {risk_level}."
        )
    }


# ── LLM call (OpenAI or Groq) ────────────────────────────────

def _llm_verdict(evidence: dict) -> dict:
    """
    Call GPT-4o-mini (OpenAI) or llama3-8b (Groq) with the structured evidence.
    Groq uses the same OpenAI SDK — just a different base_url + model name.
    """
    from openai import OpenAI

    openai_key = os.getenv("OPENAI_API_KEY")
    groq_key   = os.getenv("GROQ_API_KEY")

    if openai_key:
        client = OpenAI(api_key=openai_key)
        model  = "gpt-4o-mini"
        log.info("Using OpenAI gpt-4o-mini for verdict.")
    elif groq_key:
        client = OpenAI(
            api_key=groq_key,
            base_url="https://api.groq.com/openai/v1"
        )
        model = "llama3-8b-8192"
        log.info("Using Groq llama3-8b-8192 for verdict (free tier).")
    else:
        raise EnvironmentError("No LLM API key found.")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": _build_user_prompt(evidence)},
        ],
        temperature=0.2,   # low temp = consistent, deterministic outputs
        max_tokens=256,
    )

    raw = response.choices[0].message.content.strip()

    # Parse the JSON the LLM returns
    verdict = json.loads(raw)

    # Validate required fields are present
    assert "final_risk_score" in verdict
    assert "risk_level"       in verdict
    assert "explanation"      in verdict

    return verdict


# ── Public API ───────────────────────────────────────────────

def judge(evidence: dict) -> dict:
    """
    Main entry point called by routes/analyze.py.

    Args:
        evidence: {
            "authenticity_score": float,   # from classifier
            "dsp_output": dict,            # from dsp module
            "context": dict                # transaction_type, caller_id_match
        }

    Returns:
        { "final_risk_score": int, "risk_level": str, "explanation": str }
        Always returns a valid dict — falls back to rule-based if no API key.
    """
    has_llm_key = bool(os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY"))

    if not has_llm_key:
        log.warning("No LLM API key found. Using rule-based fallback verdict.")
        return _rule_based_verdict(evidence)

    try:
        return _llm_verdict(evidence)
    except Exception as e:
        # If the LLM call fails for any reason (rate limit, network, bad JSON),
        # fall back gracefully rather than crashing the whole request.
        log.error(f"LLM judge failed ({e}). Falling back to rule-based verdict.")
        return _rule_based_verdict(evidence)
