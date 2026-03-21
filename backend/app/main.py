from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.models import AnalyzeRequest
import json

app = FastAPI(title="Prove Guard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    async def stream():
        yield json.dumps({"step": "cloning", "message": "Cloning repository..."}) + "\n"
        yield json.dumps({"step": "done", "message": "Pipeline not yet implemented"}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")
