# VoiceGuard 🎙️🛡️
> SIH 2026 | Problem ID: SIH26104 | AI-powered voice-clone detection

---

## Repo Structure

```
VoiceGuard/
├── shared/
│   └── schema.json          ← JSON contract all components must follow (READ THIS FIRST)
│
├── ai-ml/
│   ├── classifier/
│   │   ├── train.py         ← Train wav2vec2 + LogReg on ASVspoof 2019 LA
│   │   └── predict.py       ← predict(audio_path) → float (spoof probability)
│   └── dsp/
│       └── dsp.py           ← extract_dsp_features(audio_path) → dict
│
├── backend/
│   ├── main.py              ← FastAPI app, CORS, uvicorn entry
│   ├── routes/
│   │   └── analyze.py       ← POST /analyze endpoint
│   └── llm_judge/
│       └── judge.py         ← judge(evidence) → {risk_score, risk_level, explanation}
│
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── HomePage.jsx  ← Upload UI
│       │   └── ResultPage.jsx← Score + explanation display
│       └── components/
│           ├── RiskGauge.jsx ← Visual risk gauge
│           └── DspFlags.jsx  ← DSP badge grid
│
├── data/LA/                 ← ASVspoof 2019 LA dataset goes here (gitignored)
├── .env.example             ← Copy to .env and fill in OPENAI_API_KEY
└── .gitignore
```

---

## Team Split (suggested)

| Person | Owns |
|--------|------|
| ML Dev 1 | `ai-ml/classifier/` — wav2vec2 embeddings + LogReg training |
| ML Dev 2 | `ai-ml/dsp/` — silero-VAD + librosa feature extraction |
| Backend Dev | `backend/` — FastAPI endpoint + LLM judge |
| Frontend Dev | `frontend/` — React upload & result UI |

**Contract**: Everyone reads `shared/schema.json` first. All functions must input/output exactly that shape.

---

## Setup (Quick)

```bash
# 1. Install dependencies & environment (Automatic via uv)
uv sync

# 2. Start Backend API
uv run start-backend
# or: uv run uvicorn backend.main:app --reload --port 8000
```

> **Note**:
> - **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
> - **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)


