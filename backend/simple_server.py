#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
import json
import os
from typing import Dict, List
import hashlib
import datetime

app = FastAPI(title="Portfolio API - Simplified")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory storage (for demo purposes)
users_db = {}
portfolios_db = {}
transactions_db = {}

class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: int
    email: str
    username: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.get("/")
def root():
    return {"message": "Portfolio Investment Platform API - Simplified", "status": "running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.now().isoformat()}

@app.post("/api/register", response_model=User)
def register_user(user_data: UserCreate):
    # Check if user already exists
    for user in users_db.values():
        if user["email"] == user_data.email or user["username"] == user_data.username:
            raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    user_id = len(users_db) + 1
    new_user = {
        "id": user_id,
        "email": user_data.email,
        "username": user_data.username,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.datetime.now().isoformat()
    }
    
    users_db[user_id] = new_user
    
    return User(
        id=user_id,
        email=user_data.email,
        username=user_data.username
    )

@app.post("/api/token", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Simple authentication
    for user in users_db.values():
        if (user["username"] == form_data.username or user["email"] == form_data.username) and \
           user["password_hash"] == hash_password(form_data.password):
            # Simple token (in production, use JWT)
            token = f"user_{user['id']}_token"
            return TokenResponse(access_token=token, token_type="bearer")
    
    raise HTTPException(status_code=401, detail="Incorrect username or password")

@app.get("/api/users/me", response_model=User)
def get_current_user():
    # For demo, return a mock user
    if not users_db:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Return the first user (simplified)
    user = list(users_db.values())[0]
    return User(
        id=user["id"],
        email=user["email"],
        username=user["username"]
    )

@app.get("/api/portfolios/")
def get_portfolios():
    return []

@app.get("/api/dashboard/")
def get_dashboard():
    return {
        "portfolios": [],
        "total_patrimony": 0,
        "total_invested": 0,
        "total_return": 0,
        "total_return_percentage": 0,
        "asset_allocation": [],
        "performance_metrics": {},
        "recent_transactions": []
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Iniciando servidor simplificado na porta 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
