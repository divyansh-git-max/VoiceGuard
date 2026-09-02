import uvicorn
from backend.main import app

# Hugging Face Gradio SDK automatically runs `python app.py`.
# We use this file to hijack the boot process and start our FastAPI server instead!
# We must bind to port 7860, as that is the only port Hugging Face exposes to the internet.

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
