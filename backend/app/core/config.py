"""
Core Application Configuration
Loads environment variables and system settings.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "AlphaQuant AI Stock Intelligence Platform"
    API_V1_STR: str = "/api"
    
    # Server
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_stock_intelligence"
    
    # Security
    JWT_SECRET: str = "super_secret_jwt_alphaquant_key_replace_in_production_32char_min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    
    # External APIs
    NEWS_API_KEY: str = ""
    FRED_API_KEY: str = ""
    GOOGLE_FACT_CHECK_API_KEY: str = ""
    
    # Machine Learning Defaults
    CONFIDENCE_LEVEL: float = 0.90
    REGIME_COMPONENTS: int = 2
    DRIFT_P_VALUE_THRESHOLD: float = 0.05
    RANDOM_SEED: int = 42

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"


settings = Settings()
