from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
import shutil
import os
from pathlib import Path

from ..database import get_db
from .. import models, schemas, auth
from ..auth import get_password_hash, verify_password

router = APIRouter(prefix="/api/settings", tags=["settings"])

# User Profile Endpoints
@router.get("/profile", response_model=schemas.UserProfile)
def get_user_profile(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        # Create default profile if it doesn't exist
        profile = models.UserProfile(
            user_id=current_user.id,
            name=current_user.username,
            profile_visible=True,
            email_verified=False,
            phone_verified=False
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile

@router.put("/profile", response_model=schemas.UserProfile)
def update_user_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        # Create profile if it doesn't exist
        profile_data = profile_update.model_dump(exclude_unset=True)
        profile = models.UserProfile(user_id=current_user.id, **profile_data)
        db.add(profile)
    else:
        # Update existing profile
        profile_data = profile_update.model_dump(exclude_unset=True)
        for field, value in profile_data.items():
            setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile

# User Settings Endpoints
@router.get("/preferences", response_model=schemas.UserSettings)
def get_user_settings(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's settings"""
    settings = db.query(models.UserSettings).filter(
        models.UserSettings.user_id == current_user.id
    ).first()
    
    if not settings:
        # Create default settings if they don't exist
        settings = models.UserSettings(
            user_id=current_user.id,
            theme=models.ThemeMode.LIGHT,
            language=models.Language.PT_BR,
            currency=models.Currency.BRL,
            email_notifications=True,
            push_notifications=True,
            sms_notifications=False,
            portfolio_alerts=True,
            price_alerts=True,
            news_notifications=False,
            show_portfolio_value=True,
            two_factor_enabled=False,
            decimal_places=2,
            chart_type=models.ChartType.LINE,
            refresh_interval=60,
            compact_view=False
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

@router.put("/preferences", response_model=schemas.UserSettings)
def update_user_settings(
    settings_update: schemas.UserSettingsUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's settings"""
    settings = db.query(models.UserSettings).filter(
        models.UserSettings.user_id == current_user.id
    ).first()
    
    if not settings:
        # Create settings if they don't exist
        settings_data = settings_update.model_dump(exclude_unset=True)
        settings = models.UserSettings(user_id=current_user.id, **settings_data)
        db.add(settings)
    else:
        # Update existing settings
        settings_data = settings_update.model_dump(exclude_unset=True)
        for field, value in settings_data.items():
            setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    return settings

# Change Password Endpoint
@router.post("/change-password")
def change_password(
    password_request: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(password_request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_request.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

# Avatar Upload Endpoint
@router.post("/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar"""
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    filename = f"user_{current_user.id}_avatar.{file_extension}"
    file_path = upload_dir / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save file"
        )
    
    # Update profile with avatar URL
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        profile = models.UserProfile(
            user_id=current_user.id,
            avatar_url=f"/uploads/avatars/{filename}"
        )
        db.add(profile)
    else:
        profile.avatar_url = f"/uploads/avatars/{filename}"
    
    db.commit()
    
    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": f"/uploads/avatars/{filename}"
    }

# Export Data Endpoint
@router.get("/export")
def export_user_data(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export all user data"""
    # Get user's portfolios
    portfolios = db.query(models.Portfolio).filter(
        models.Portfolio.owner_id == current_user.id
    ).all()
    
    # Get user's transactions
    transactions = db.query(models.Transaction).join(models.Portfolio).filter(
        models.Portfolio.owner_id == current_user.id
    ).all()
    
    # Get user's dividends
    dividends = db.query(models.Dividend).join(models.Portfolio).filter(
        models.Portfolio.owner_id == current_user.id
    ).all()
    
    # Get user profile and settings
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    settings = db.query(models.UserSettings).filter(
        models.UserSettings.user_id == current_user.id
    ).first()
    
    # Prepare export data
    export_data = {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        },
        "profile": {
            "name": profile.name if profile else None,
            "bio": profile.bio if profile else None,
            "phone": profile.phone if profile else None,
            "location": profile.location if profile else None,
            "website": profile.website if profile else None,
            "linkedin": profile.linkedin if profile else None
        } if profile else None,
        "settings": {
            "theme": settings.theme.value if settings else "LIGHT",
            "language": settings.language.value if settings else "PT_BR",
            "currency": settings.currency.value if settings else "BRL",
            "email_notifications": settings.email_notifications if settings else True,
            "push_notifications": settings.push_notifications if settings else True,
            "sms_notifications": settings.sms_notifications if settings else False,
            "portfolio_alerts": settings.portfolio_alerts if settings else True,
            "price_alerts": settings.price_alerts if settings else True,
            "news_notifications": settings.news_notifications if settings else False,
            "show_portfolio_value": settings.show_portfolio_value if settings else True,
            "decimal_places": settings.decimal_places if settings else 2,
            "chart_type": settings.chart_type.value if settings else "LINE",
            "refresh_interval": settings.refresh_interval if settings else 60,
            "compact_view": settings.compact_view if settings else False
        } if settings else None,
        "portfolios": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "currency": p.currency.value,
                "benchmark": p.benchmark,
                "created_at": p.created_at.isoformat() if p.created_at else None
            }
            for p in portfolios
        ],
        "transactions": [
            {
                "id": t.id,
                "portfolio_id": t.portfolio_id,
                "asset_id": t.asset_id,
                "transaction_type": t.transaction_type.value,
                "date": t.date.isoformat() if t.date else None,
                "quantity": t.quantity,
                "price": t.price,
                "total_amount": t.total_amount,
                "fees": t.fees,
                "taxes": t.taxes,
                "currency": t.currency.value,
                "notes": t.notes,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in transactions
        ],
        "dividends": [
            {
                "id": d.id,
                "portfolio_id": d.portfolio_id,
                "asset_id": d.asset_id,
                "dividend_type": d.dividend_type.value,
                "amount_per_share": d.amount_per_share,
                "total_amount": d.total_amount,
                "shares_quantity": d.shares_quantity,
                "payment_date": d.payment_date.isoformat() if d.payment_date else None,
                "gross_amount": d.gross_amount,
                "tax_amount": d.tax_amount,
                "net_amount": d.net_amount,
                "currency": d.currency.value,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in dividends
        ]
    }
    
    return export_data

# Delete Account Endpoint
@router.delete("/account")
def delete_user_account(
    password_confirmation: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete user account and all associated data"""
    # Verify password
    if not verify_password(password_confirmation, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password confirmation is incorrect"
        )
    
    # Delete user (cascade will handle related data)
    db.delete(current_user)
    db.commit()
    
    return {"message": "Account deleted successfully"}

# Two-Factor Authentication Endpoints
@router.post("/2fa/enable")
def enable_two_factor_auth(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Enable two-factor authentication"""
    # This is a placeholder - implement actual 2FA logic
    settings = db.query(models.UserSettings).filter(
        models.UserSettings.user_id == current_user.id
    ).first()
    
    if settings:
        settings.two_factor_enabled = True
        db.commit()
    
    return {
        "message": "Two-factor authentication enabled",
        "qr_code": "data:image/png;base64,placeholder_qr_code",  # Placeholder
        "secret_key": "PLACEHOLDER_SECRET_KEY"  # Placeholder
    }

@router.post("/2fa/disable")
def disable_two_factor_auth(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Disable two-factor authentication"""
    settings = db.query(models.UserSettings).filter(
        models.UserSettings.user_id == current_user.id
    ).first()
    
    if settings:
        settings.two_factor_enabled = False
        db.commit()
    
    return {"message": "Two-factor authentication disabled"}
