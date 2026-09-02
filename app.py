import spaces
import gradio as gr
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.routes.auth import router as auth_router
from backend.routes.analyze import router as analyze_router

# 1. Initialize SQLite/Postgres DB
init_db()

# 2. Mandatory ZeroGPU function (Must be connected to Gradio queue)
@spaces.GPU
def allocate_gpu():
    return "ZeroGPU Active"

# 3. Create Gradio Blocks
with gr.Blocks(title="VoiceGuard Forensic API") as demo:
    gr.Markdown("# ??? VoiceGuard Forensic AI Server")
    gr.Markdown("ZeroGPU Backend is online and accepting API requests from Vercel.")
    dummy_btn = gr.Button("Init", visible=False)
    dummy_out = gr.Textbox(visible=False)
    dummy_btn.click(fn=allocate_gpu, inputs=[], outputs=[dummy_out])

# 4. Enable CORS so Vercel can talk to this Space
demo.app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Attach your FastAPI routers
demo.app.include_router(auth_router)
demo.app.include_router(analyze_router)

@demo.app.get("/health")
def health_check():
    return {"status": "healthy", "service": "voiceguard-api"}

# 6. Launch with queue (ZeroGPU MANDATORY requirement to keep container alive)
demo.queue().launch(server_name="0.0.0.0", server_port=7860)

