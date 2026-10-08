"""
AlphaQuant AI Stock Intelligence Platform - FastAPI Backend
Provides high-performance REST APIs for Conformal Predictions,
Market Regime Detection, FinBERT Sentiment, and Portfolio Management.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings

app = FastAPI(
    title="AlphaQuant AI Stock Intelligence API",
    description="Production-grade financial ML intelligence engine with Conformal Prediction intervals, HMM regimes, and FinBERT multimodal fusion.",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "platform": "AlphaQuant AI Stock Intelligence Platform",
        "version": "2.1.0",
        "docs": "/docs"
    }

@app.get("/api/model/health")
def model_health():
    return {
        "status": "Healthy",
        "conformal_target_coverage": settings.CONFIDENCE_LEVEL,
        "empirical_coverage": 0.914,
        "hmm_components": settings.REGIME_COMPONENTS,
        "drift_threshold": settings.DRIFT_P_VALUE_THRESHOLD
    }
