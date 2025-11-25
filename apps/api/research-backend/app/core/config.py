"""
Application Configuration
"""

from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # App
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    PROJECT_NAME: str = "Regen Research Backend"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/research_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # Vector DB
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_COLLECTION: str = "research_chunks"
    
    # Storage (S3-compatible)
    S3_ENDPOINT_URL: str = "http://localhost:9000"  # MinIO for dev
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "research-documents"
    S3_REGION: str = "us-east-1"
    
    # Embeddings
    EMBEDDING_PROVIDER: str = "openai"  # openai, local, anthropic
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_BATCH_SIZE: int = 64
    EMBEDDING_CACHE_TTL: int = 86400  # 24 hours
    
    # LLM
    LLM_PROVIDER: str = "openai"  # openai, anthropic, local
    LLM_MODEL: str = "gpt-4-turbo-preview"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2000
    
    # Ingestion
    MAX_FILE_SIZE_MB: int = 100
    SUPPORTED_FILE_TYPES: List[str] = [".pdf", ".docx", ".txt", ".md", ".html"]
    CHUNK_SIZE: int = 800  # tokens
    CHUNK_OVERLAP: int = 100  # tokens
    
    # Query
    DEFAULT_TOP_K: int = 10
    MAX_TOP_K: int = 50
    RERANK_TOP_K: int = 8
    
    # Security
    JWT_SECRET: str = "dev-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    API_KEY_HEADER: str = "X-API-Key"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

