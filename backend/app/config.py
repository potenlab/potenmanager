from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    UPLOAD_DIR: str = "./data/uploads"
    PROJECT_ROOT: str = ".."
    CLAUDE_CLI_PATH: str = "claude"
    CLAUDE_MAX_TURNS: int = 15
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def projects_dir(self) -> Path:
        return Path(self.PROJECT_ROOT) / "data" / "projects"

    class Config:
        env_file = ".env"


settings = Settings()
