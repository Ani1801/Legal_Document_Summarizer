import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "fallback_secret_key_if_not_in_env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    MONGO_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "auditor_ai"

    class Config:
        env_file = ".env"

settings = Settings()
