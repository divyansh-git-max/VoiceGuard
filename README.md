# 🛡️ VoiceGuard

VoiceGuard is a real-time forensic AI system designed to detect synthetic, cloned, and spoofed voices. Built to combat AI-driven audio fraud, VoiceGuard analyzes live microphone recordings or uploaded audio files using a combination of Deep Learning embeddings, Digital Signal Processing (DSP) heuristics, and an LLM-driven judge to provide a definitive risk verdict.

## 🏗️ System Architecture

VoiceGuard is split into a decoupled frontend and backend, optimized for free-tier cloud deployment while still harnessing powerful GPU acceleration.

*   **Frontend (Vercel):** A React-based web application that handles user authentication and captures live microphone audio (in `.webm` format) or file uploads, passing them directly to the backend.
*   **Backend (Hugging Face Spaces - ZeroGPU):** A hybrid FastAPI + Gradio server. It acts as a headless REST API while utilizing Hugging Face's ZeroGPU infrastructure to dynamically allocate GPU resources for PyTorch model inference.

### 🧠 The Inference Pipeline
1.  **Format Normalization:** Uploaded `.webm` or `.mp3` files are dynamically converted to standard `.wav` using `pydub` and `ffmpeg`.
2.  **DSP Analysis:** `librosa` extracts acoustic features (pitch anomalies, spectral centroid, timing patterns).
3.  **Deep Learning Classifier (GPU):** A fine-tuned `ai4bharat/indicwav2vec-hindi` transformer model extracts embeddings and predicts synthetic probability.
4.  **LLM Judge:** A language model evaluates the DSP flags, the ML authenticity score, and the transaction context to output a final JSON verdict and explanation.

---

## 🚀 Key Technical Solutions (ZeroGPU Bridge)

Hugging Face's ZeroGPU normally requires all GPU workloads to be triggered by a Gradio UI event, which breaks standard FastAPI endpoints. VoiceGuard solves this using an **Internal ZeroGPU Bridge**:
*   The FastAPI app runs concurrently with a hidden Gradio UI.
*   When a POST request hits the FastAPI `/analyze` endpoint, it uses `gradio_client` to silently trigger a hidden Gradio API on `localhost`.
*   This perfectly routes the PyTorch inference through Gradio's strict event queue, allocating the GPU seamlessly.

---

## 🛠️ Setup & Deployment

### 1. Prerequisites
*   Python 3.10+
*   `ffmpeg` installed on your system (Required for `.webm` microphone decoding).

### 2. Environment Variables
If hosting on Hugging Face Spaces, you must add the following **Secrets**:
*   `HF_TOKEN`: Your Hugging Face Read token. **Required** to download the gated `ai4bharat/indicwav2vec-hindi` model.
*   `DATABASE_URL` *(Optional)*: A PostgreSQL connection string (e.g., Neon or Supabase) for persistent user accounts. If omitted, VoiceGuard falls back to a temporary local SQLite database (`voiceguard.db`).

### 3. Hugging Face Spaces Configuration
To deploy on Hugging Face, ensure the root of your repository contains:
*   `packages.txt`: Must contain `ffmpeg` (installs the system-level media decoder).
*   `requirements.txt`: Must contain `fastapi`, `uvicorn`, `gradio`, `pydub`, `librosa`, `torch`, `transformers`, `soundfile`, `sqlalchemy`.

### 4. Running Locally
```bash
# Clone the repository
git clone https://github.com/yourusername/VoiceGuard.git
cd VoiceGuard

# Install dependencies
pip install -r requirements.txt

# Run the hybrid server
python app.py
```
*Note: The server will start on `http://127.0.0.1:7860`.*

---

## 🔌 API Reference

*(Note: When deployed on Hugging Face Spaces, all endpoints must be prefixed with `/gradio_api` to pass through the Node.js reverse proxy.)*

### `POST /gradio_api/auth/register`
Creates a new user account.
*   **Body:** `{"username": "testuser", "email": "test@test.com", "password": "password"}`

### `POST /gradio_api/auth/login`
Authenticates a user.
*   **Body:** `{"username_or_email": "testuser", "password": "password"}`

### `POST /gradio_api/analyze`
The primary forensic analysis endpoint.
*   **Content-Type:** `multipart/form-data`
*   **Fields:**
    *   `audio` or `audio_file`: The audio file blob (`.webm`, `.wav`, etc.)
    *   `transaction_type` (string): Context (e.g., "unknown")
    *   `caller_id_match` (boolean): Context flag
*   **Response:**
    ```json
    {
      "chunk_id": "vg-chunk-a1b2c3d4",
      "model1_output": {
        "authenticity_score": 0.985
      },
      "dsp_output": ["high_pitch_variance"],
      "context": {"transaction_type": "unknown", "caller_id_match": true},
      "llm_judge_output": {
        "final_risk_score": 98,
        "risk_level": "high",
        "explanation": "High synthetic probability detected alongside abnormal pitch variance."
      }
    }
    ```

---

## 📁 Repository Structure
*   `/app.py` - Main entrypoint, ZeroGPU setup, and API router mounting.
*   `/backend/routes/` - FastAPI endpoints (`auth.py`, `analyze.py`).
*   `/backend/database.py` - SQLAlchemy models and DB initialization.
*   `/ai_ml/classifier/` - PyTorch `indicwav2vec` inference logic.
*   `/ai_ml/dsp/` - Audio signal processing heuristics.
*   `/frontend/` - React/Vercel UI codebase.
