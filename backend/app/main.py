from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from . import models, schemas, auth
from .database import engine, get_db
from .config import settings
from .routers import portfolios, assets, transactions, dashboard, imports, user_settings, dividends, optimization, notifications

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Portfolio Investment Platform",
    description="API for managing investment portfolios",
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

# Include routers
app.include_router(portfolios.router, prefix="/api/portfolios", tags=["portfolios"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(imports.router, prefix="/api/import", tags=["import"])
app.include_router(user_settings.router)
app.include_router(dividends.router, prefix="/api/dividends", tags=["dividends"])
app.include_router(optimization.router, prefix="/api/optimization", tags=["optimization"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

@app.get("/")
def read_root():
    return {"message": "Portfolio Investment Platform API", "version": "1.0.0"}

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

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
