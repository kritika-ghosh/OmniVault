import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "OmniVault"
    CHROMADB_DIR: str = os.path.join(os.getcwd(), "chroma_db")
    
    # 1. Add this explicit field declaration so Pydantic permits and loads your key
    GROQ_API_KEY: str = ""
    
    # Target active model infrastructure configurations
    DEFAULT_LLM_MODEL: str = "groq/llama-3.3-70b-versatile" 
    SIMILARITY_THRESHOLD: float = 0.45

    # Enforce Pydantic to read from your environment configuration file automatically
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"  # Softens constraints to bypass strict cross-variable validations
    )

settings = Settings()
