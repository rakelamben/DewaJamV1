from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Konfigurasi aplikasi yang dimuat dari environment variables / .env."""

    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_JWKS_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


# Diinstansiasi di level modul.
# Jika DATABASE_URL, SUPABASE_URL, atau SUPABASE_JWT_SECRET tidak ditemukan,
# pydantic-settings akan raise ValidationError saat baris ini dieksekusi.
# main.py menangkap ValidationError tersebut dan mengubahnya ke SystemExit.
settings = Settings()
