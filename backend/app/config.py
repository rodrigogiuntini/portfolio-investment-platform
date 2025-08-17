from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://portfolio_user:portfolio_pass@localhost:5432/portfolio_db")
    
    # Supabase Configuration
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY: Optional[str] = os.getenv("SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_KEY")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-please-use-a-secure-random-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # API Configuration
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Portfolio Investment Platform"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # API Keys for external services
    ALPHA_VANTAGE_KEY: Optional[str] = os.getenv("ALPHA_VANTAGE_KEY")
    YAHOO_FINANCE_API_KEY: Optional[str] = os.getenv("YAHOO_FINANCE_API_KEY")
    
    # CORS - Updated for production
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:5175",
        "https://portfolio-investment-platform.vercel.app",
        "https://*.vercel.app"
    ]
    
    # Redis (for caching)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Email Configuration (optional)
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL for SQLAlchemy"""
        if self.DATABASE_URL.startswith("postgresql://"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
        return self.DATABASE_URL
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
