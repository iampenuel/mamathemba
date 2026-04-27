import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

from app.api.routes.cases import router as cases_router
from app.api.routes.handoff import router as handoff_router

app = FastAPI(title="Mamathemba API", version="0.1.0")

LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def _allowed_origins() -> list[str]:
    configured = [
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
        if origin.strip()
    ]

    origins: list[str] = []
    for origin in [*LOCAL_FRONTEND_ORIGINS, *configured]:
        if origin not in origins:
            origins.append(origin)

    return origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "mamathemba-backend",
        "version": "0.1.0",
    }

app.include_router(cases_router)
app.include_router(handoff_router)
