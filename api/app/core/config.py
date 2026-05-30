from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_ENV: str = ""
    APP_NAME: str = ""

    # Database
    DATABASE_NAME: str = ""
    DATABASE_USERNAME: str = ""
    DATABASE_PASSWORD: str = ""
    DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str = ""

    # Auth
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Google OIDC
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    GOOGLE_AUTH_URL: str = ""
    GOOGLE_TOKEN_URL: str = ""
    GOOGLE_USERINFO_URL: str = ""
    FRONTEND_BASE_URL: str = ""
    
    # AI Provider
    AI_PROVIDER: str = ""
    ANTHROPIC_API_KEY: str = ""

    # CORS
    CORS_ALLOW_ORIGINS: list[str] = []

settings = Settings()
