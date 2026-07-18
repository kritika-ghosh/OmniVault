import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

def get_default_mutated_dir(name: str) -> str:
    # Resolve relative to the backend directory (d:\Desktop\projects\OmniVault\backend)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
    return os.path.join(backend_dir, "data", name)

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", 8000))
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_API_BASE: str = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", get_default_mutated_dir("mutated_chroma_data"))
    SESSION_STORE_DIR: str = os.getenv("SESSION_STORE_DIR", get_default_mutated_dir("mutated_sessions"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
