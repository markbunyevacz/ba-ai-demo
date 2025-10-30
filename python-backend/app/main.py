from fastapi import FastAPI
from .routers import health

app = FastAPI(
    title="Energia AI API",
    description="API for the Energia AI platform.",
    version="0.1.0",
)

app.include_router(health.router, prefix="/api")


@app.get("/", tags=["root"])
async def read_root():
    return {"message": "Welcome to the Energia AI API"}
