import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db
from backend.routes.auth import router as auth_router
from backend.routes.analyze import router as analyze_router
# Initialize database tables and seed single admin
init_db()

app = FastAPI(
    title="VoiceGuard API",
    description="AI-powered voice-clone detection for real-time fraud prevention",
    version="0.1.0",
)

# Enable CORS for frontend clients (e.g. Vite on localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(analyze_router)


@app.get("/")
def root():
    return {
        "service": "VoiceGuard API",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "voiceguard-api",
    }


def start():
    """CLI entrypoint for running the server."""
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    start()
