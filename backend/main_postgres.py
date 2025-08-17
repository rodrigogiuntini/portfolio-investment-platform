#!/usr/bin/env python3
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app import models, schemas, auth
from app.database import engine, get_db
from app.config import settings
from app.routers import portfolios, dashboard, transactions, assets, dividends

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Portfolio Investment Platform - PostgreSQL",
    description="API for managing investment portfolios with PostgreSQL",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with proper calculation logic
app.include_router(portfolios.router, prefix="/api/portfolios", tags=["portfolios"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(dividends.router, prefix="/api/dividends", tags=["dividends"])

@app.get("/")
def read_root():
    return {"message": "Portfolio Investment Platform API - PostgreSQL", "version": "1.0.0"}

@app.get("/health")
@app.get("/api/health")
def health_check():
    """Health check endpoint for monitoring and startup verification"""
    return {
        "status": "healthy",
        "service": "Portfolio Investment Platform",
        "database": "postgresql",
        "version": "1.0.0"
    }

@app.post("/api/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    db_user = auth.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = auth.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    return auth.create_user(db=db, user=user)

@app.post("/api/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get current user info"""
    return current_user

# Portfolio and dashboard endpoints are now handled by routers
# which include proper calculation logic
# The inline endpoints below are disabled in favor of the routers

if __name__ == "__main__":
    import uvicorn
    print("🚀 Iniciando servidor PostgreSQL na porta 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)


