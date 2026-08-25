from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    firestore_database: str = "(default)"
    gemini_model: str = "gemini-2.5-flash"


settings = Settings()
