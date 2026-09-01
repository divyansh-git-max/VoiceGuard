# VoiceGuard 🎙️🛡️
> SIH 2026 | Problem ID: SIH26104 | AI-powered voice-clone detection and real-time fraud prevention

---

## 📁 Repo Structure

```
VoiceGuard/
├── shared/
│   └── schema.json              ← JSON contract all components must follow
│
├── ai-ml/
│   ├── classifier/
│   │   ├── models/
│   │   │   └── model.pkl        ← Pre-trained classifier artifact (wav2vec2 + LogReg/SVM)
│   │   ├── train.py             ← Model training script on ASVspoof dataset
│   │   ├── predict.py           ← Inference engine (CLI & Python API)
│   │   └── evaluate_eval.py     ← Model evaluation & test metrics script
│   └── dsp/
│       └── dsp.py               ← extract_dsp_features(audio_path) → DSP anomaly metrics
│
├── backend/
│   ├── main.py                  ← FastAPI server, CORS middleware, entrypoint
│   ├── database.py              ← PostgreSQL / Neon DB connection & admin seeder
│   ├── models.py                ← SQLAlchemy database models (User, Role)
│   ├── auth.py                  ← Password hashing, JWT token handling
│   ├── schemas.py               ← Pydantic request/response schemas
│   ├── routes/
│   │   ├── auth.py              ← POST /auth/login, POST /auth/register
│   │   └── analyze.py           ← POST /analyze pipeline endpoint
│   └── llm_judge/
│       └── judge.py             ← LLM forensic judge (risk score & explanation)
│
├── frontend/
│   ├── package.json             ← React 18, Vite, Tailwind CSS v4, Framer Motion
│   ├── vite.config.js           ← Vite config with backend proxy (/analyze, /auth)
│   └── src/
│       ├── App.jsx              ← React Router & authentication route guards
│       ├── index.css            ← VoiceGuard Design System & theme styling
│       ├── pages/
│       │   ├── LoginPage.jsx    ← Split-screen login page with Neon DB auth
│       │   ├── SignupPage.jsx   ← User registration page
│       │   ├── HomePage.jsx     ← Audio upload, live recording, & test presets
│       │   └── ResultPage.jsx   ← Risk score gauge, DSP breakdown & telemetry
│       └── components/
│           ├── Navbar.jsx       ← Top navigation with user status & logout
│           ├── RiskGauge.jsx    ← Visual animated risk gauge
│           ├── DspFlags.jsx     ← Forensic DSP anomaly indicator grid
│           └── AudioPlayer.jsx  ← Custom waveform audio player
│
├── data/LA/                     ← ASVspoof 2019 LA dataset (gitignored)
├── .env.example                 ← Environment variable template
└── requirements.txt             ← Python dependencies
```

---

## ⚙️ Environment Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in the required values:
- `DATABASE_URL`: Your Neon PostgreSQL connection string (or leave empty for local SQLite fallback).
- `SECRET_KEY`: Secret key for signing session tokens.
- `OPENAI_API_KEY` or `GEMINI_API_KEY`: API key for the LLM forensic threat judge.

---

## 🚀 Running the Project

### 1. Backend Server (FastAPI)

```bash
# Install Python dependencies
uv sync

# Start the FastAPI server on port 8000
uv run start-backend
# Alternatively:
# uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 2. Frontend Application (React + Vite)

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

- **Web Application URL**: [http://localhost:5173](http://localhost:5173)

#### Default Admin Credentials:
* **Username / Email**: `admin` or `admin@voiceguard.com`
* **Password**: `AdminSecret123!`
* *Or click **Create account** to register a new user in the database.*

---

## 🧠 Synthetic Voice Classifier (`ai-ml/classifier/`)

### Overview
The AI classifier is VoiceGuard's core neural detection engine. Given an audio recording (`.wav`, `.mp3`, `.flac`, `.m4a`), it predicts whether the voice is **SYNTHETIC** (AI voice clone, TTS, or voice conversion attack) or **BONAFIDE** (authentic human speaker) by returning a probability score between `0.0` and `1.0`.

### Architecture & How It Works
* **Pre-trained Backbone**: `ai4bharat/indicwav2vec-hindi` — a 300M-parameter Wav2Vec2-Large model pre-trained on diverse Indian languages and dialects to prevent false positives on regional accents.
* **Feature Representation**: Extracts 1024-dim frame embeddings and applies **Temporal Statistical Pooling** (Mean + Standard Deviation $\rightarrow$ 2048-dim feature vector) to capture subtle vocoder glitches and acoustic variance anomalies.
* **Classification Head**: Trained on **27,880 audio clips** (ASVspoof 2019 Logical Access dataset mixed with 2,500 native Mozilla Common Voice Hindi human recordings).
* **Validated Performance**:
  * **ROC-AUC Score**: `0.9974` (99.74% separation)
  * **Equal Error Rate (EER)**: `2.66%`
  * **Accuracy**: `97.34%`

---

### How to Test Any Audio Sample

#### 1. Via Command Line (CLI)
Test any audio file directly from the project root:

```bash
uv run python ai-ml/classifier/predict.py "path/to/your_audio.wav"
```

**Example Output:**
```text
=======================================================
🎙️🛡️ VOICEGUARD AUDIO ANALYSIS VERDICT
=======================================================
  • File:               path/to/your_audio.wav
  • Verdict:            SYNTHETIC
  • Synthetic Prob:     99.97% (score: 0.9997)
  • Decision Threshold: 0.9644
  • Model Confidence:   100.0%
  • Backbone:           ai4bharat/indicwav2vec-hindi
=======================================================
```

*(Tip: Append `--json` to output results as raw JSON).*

---

#### 2. In Python Code (Backend Integration)
Import `predict` into any route or Python script:

```python
from ai_ml.classifier.predict import predict, predict_detailed

# 1. Quick probability score (0.0 = Real Human, 1.0 = AI Cloned)
# Satisfies shared/schema.json "authenticity_score"
prob = predict("path/to/audio.wav")
print(f"Synthetic Probability: {prob:.4f}")

# 2. Full structured metadata
details = predict_detailed("path/to/audio.wav")
print(details)
# {
#   "authenticity_score": 0.9997,
#   "is_synthetic": True,
#   "label": "SYNTHETIC",
#   "confidence": 1.0,
#   "threshold": 0.9644,
#   "backbone": "ai4bharat/indicwav2vec-hindi",
#   "device": "cuda"
# }
```

---

#### 3. Run Benchmark Suite on Unseen Audio
To batch-test random unseen clips from the official ASVspoof 2019 Eval dataset and unseen Hindi recordings:

```bash
# may take some time on first run
uv run python ai-ml/classifier/evaluate_eval.py --samples 500
```
