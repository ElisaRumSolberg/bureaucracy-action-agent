from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    firestore_database: str = "(default)"
    gemini_model: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"


settings = Settings()
