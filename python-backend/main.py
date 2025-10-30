# FastAPI application entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config.settings import settings
from api.routes import upload, jira, grounding, compliance, monitoring, diagrams, ai

app = FastAPI(
    title="BA AI Demo API",
    version="2.0.0",
    description="Python FastAPI Backend - Microservices Architecture"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(jira.router, prefix="/api/jira", tags=["jira"])
app.include_router(grounding.router, prefix="/api/grounding", tags=["grounding"])
app.include_router(compliance.router, prefix="/api/compliance", tags=["compliance"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(diagrams.router, prefix="/api/diagrams", tags=["diagrams"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

# Static files (optional, for compatibility with existing public assets)
import os
public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
if os.path.exists(public_dir):
    app.mount("/public", StaticFiles(directory=public_dir), name="public")


@app.get("/api/health", tags=["health"])
async def health_check():
    """Simple health endpoint used by readiness probes."""
    return {
        "status": "OK",
        "version": "2.0.0",
        "backend": "python"
    }
