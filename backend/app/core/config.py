# app/core/config.py
import os
import secrets
from typing import Any, Dict, List, Optional, Union, ClassVar
from pydantic import AnyHttpUrl, field_validator, ConfigDict, ValidationInfo
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    env_path: ClassVar[str] = os.getenv("ENV_FILE", ".env")
    model_config = ConfigDict(env_file=env_path, case_sensitive=True, extra="ignore")
    API_V1_STR: str = "/api"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database Configuration
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    
    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    def assemble_db_connection(cls, v: Optional[str], info: ValidationInfo) -> Optional[str]:
        # Use full URI from env if provided
        if v and isinstance(v, str):
            return v
        data = info.data
        user = data.get("POSTGRES_USER")
        password = data.get("POSTGRES_PASSWORD")
        server = data.get("POSTGRES_SERVER")
        port = data.get("POSTGRES_PORT")
        db = data.get("POSTGRES_DB")
        return f"postgresql://{user}:{password}@{server}:{port}/{db}"
        

    # Database connection pool settings
    POOL_SIZE: int = 20
    MAX_OVERFLOW: int = 10
    POOL_TIMEOUT: int = 30
    POOL_RECYCLE: int = 1800  # 30 minutes
    
    # Redis configuration for caching
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    
    # Storage configuration (S3 or similar)
    STORAGE_SERVICE: str = "local"  # "local", "s3", "azure", etc
    STORAGE_BUCKET_NAME: str = "asikh-oms-storage"
    STORAGE_ACCESS_KEY: Optional[str] = None
    STORAGE_SECRET_KEY: Optional[str] = None
    STORAGE_REGION: Optional[str] = None
    STORAGE_ENDPOINT: Optional[str] = None
    
    # Local storage path (if using local storage)
    LOCAL_STORAGE_PATH: str = "./storage"
    
    # Image processing settings
    IMAGE_MAX_SIZE: int = 2048  # Max dimension in pixels
    IMAGE_QUALITY: int = 85  # JPEG quality
    THUMBNAIL_SIZE: int = 300  # Thumbnail dimension
    
    # Logging configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Worker settings for background tasks
    WORKERS_COUNT: int = 2
    
    # API rate limits
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # QR Code settings
    QR_CODE_VERSION: int = 10
    QR_CODE_BOX_SIZE: int = 10
    QR_CODE_BORDER: int = 4
    
    # Mobile app settings
    MIN_MOBILE_APP_VERSION: str = "1.0.0"
    FORCE_UPGRADE_VERSION: str = "0.9.0"
    
    # User role settings
    ALLOWED_ROLES: List[str] = ["admin", "harvester", "supervisor", "packhouse", "manager"]

settings = Settings()

def get_settings():
    """Function to get the settings instance"""
    return settings