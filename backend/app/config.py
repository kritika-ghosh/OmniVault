import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "OmniVault"
    CHROMADB_DIR: str = os.path.join(os.getcwd(), "chroma_db")
    
    # Updated to an active model ID supported by the Groq cloud pipeline
    DEFAULT_LLM_MODEL: str = "groq/llama-3.3-70b-versatile" 
    
    SIMILARITY_THRESHOLD: float = 0.45

    class Config:
        env_file = ".env"

settings = Settings()

#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