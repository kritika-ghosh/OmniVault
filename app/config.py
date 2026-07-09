import os
from pydantic_settings import BaseSettings, SettingsConfigDict

def get_default_notes_dir() -> str:
    config_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(config_dir)
    if os.path.basename(parent_dir) == "backend":
        workspace_dir = os.path.dirname(parent_dir)
    else:
        workspace_dir = parent_dir
    return os.path.join(workspace_dir, "testing", "markdown_notes")

def get_default_chroma_dir() -> str:
    config_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(config_dir)
    if os.path.basename(parent_dir) == "backend":
        workspace_dir = os.path.dirname(parent_dir)
    else:
        workspace_dir = parent_dir
    return os.path.join(workspace_dir, "chroma_db")

class Settings(BaseSettings):
    PROJECT_NAME: str = "OmniVault"
    CHROMADB_DIR: str = get_default_chroma_dir()
    DEFAULT_NOTES_DIR: str = get_default_notes_dir()


    
    # 1. Add this explicit field declaration so Pydantic permits and loads your key
    GROQ_API_KEY: str = ""
    
    # Target active model infrastructure configurations
    DEFAULT_LLM_MODEL: str = "groq/llama-3.3-70b-versatile" 
    SIMILARITY_THRESHOLD: float = 0.45

    # Enforce Pydantic to read from your environment configuration file automatically
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    SCHEDULER_INTERVAL_SECS: int = 60

settings = Settings()

