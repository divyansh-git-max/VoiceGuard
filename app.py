import spaces
import gradio as gr
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.routes.auth import router as auth_router
from backend.routes.analyze import router as analyze_router

# 1. Initialize Database
init_db()

# 2. Create the Master FastAPI application
app = FastAPI(title="VoiceGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Attach all API routes at the root level
app.include_router(auth_router)
app.include_router(analyze_router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "voiceguard-api"}

# 4. Mandatory ZeroGPU Function inside Gradio Block
@spaces.GPU
def allocate_gpu():
    return "ZeroGPU Active"

with gr.Blocks(title="VoiceGuard API") as demo:
    gr.Markdown("# ??? VoiceGuard Forensic AI Server")
    dummy_btn = gr.Button("Init", visible=False)
    dummy_out = gr.Textbox(visible=False)
    dummy_btn.click(fn=allocate_gpu, inputs=[], outputs=[dummy_out])

# 5. Mount Gradio to /gradio
# Hugging Face automatically serves this `app` variable on port 7860!
app = gr.mount_gradio_app(app, demo, path="/gradio")

