"""
WildSense — FastAPI Backend
============================
Main application entry point.

Run with:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import identify
from routes import species
from routes import chat as chat_route


app = FastAPI(
    title="WildSense API",
    description="Flora & Fauna identification with safety intelligence",
    version="1.0.0"
)

# ── CORS (allow frontend to call API) ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────
app.include_router(identify.router, prefix="/identify", tags=["Identification"])
app.include_router(species.router,  prefix="/species",  tags=["Species"])
app.include_router(chat_route.router,     prefix="/chat",     tags=["Chat"])

@app.get("/")
def root():
    return {"status": "WildSense API is running"}
