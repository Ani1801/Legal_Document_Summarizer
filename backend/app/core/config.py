import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Auditor AI Backend"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback_secret_key_if_not_in_env")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "auditor_ai")
    CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    
    # Vector & AI Settings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

