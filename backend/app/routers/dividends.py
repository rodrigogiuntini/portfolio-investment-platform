from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Dividend])
def get_dividends(
    portfolio_id: Optional[int] = Query(None, description="Filtrar por portfólio"),
    asset_id: Optional[int] = Query(None, description="Filtrar por ativo"),
    dividend_type: Optional[schemas.DividendTypeEnum] = Query(None, description="Filtrar por tipo"),
    start_date: Optional[date] = Query(None, description="Data inicial"),
    end_date: Optional[date] = Query(None, description="Data final"),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get dividends with optional filters"""
    query = db.query(models.Dividend).join(models.Portfolio).filter(
        models.Portfolio.owner_id == current_user.id
    )
    
    if portfolio_id:
        query = query.filter(models.Dividend.portfolio_id == portfolio_id)
    
    if asset_id:
        query = query.filter(models.Dividend.asset_id == asset_id)
        
    if dividend_type:
        query = query.filter(models.Dividend.dividend_type == dividend_type)
        
    if start_date:
        query = query.filter(models.Dividend.payment_date >= start_date)
        
    if end_date:
        query = query.filter(models.Dividend.payment_date <= end_date)
    
    dividends = query.order_by(models.Dividend.payment_date.desc()).offset(skip).limit(limit).all()
    
    # Include asset and portfolio information
    for dividend in dividends:
        dividend.asset = db.query(models.Asset).filter(
            models.Asset.id == dividend.asset_id
        ).first()
        dividend.portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.id == dividend.portfolio_id
        ).first()
    
    return dividends

@router.post("/", response_model=schemas.Dividend)
def create_dividend(
    dividend: schemas.DividendCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new dividend record"""
    
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == dividend.portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Verify position exists
    position = db.query(models.Position).filter(
        models.Position.id == dividend.position_id,
        models.Position.portfolio_id == dividend.portfolio_id,
        models.Position.asset_id == dividend.asset_id
    ).first()
    
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    # Calculate total amount and net amount
    total_amount = dividend.amount_per_share * dividend.shares_quantity
    gross_amount = dividend.gross_amount or total_amount
    net_amount = gross_amount - dividend.tax_amount
    
    # Create dividend record
    dividend_data = dividend.model_dump()
    # Remove campos que vamos recalcular
    dividend_data.pop('gross_amount', None)
    
    db_dividend = models.Dividend(
        **dividend_data,
        total_amount=total_amount,
        gross_amount=gross_amount,
        net_amount=net_amount
    )
    
    db.add(db_dividend)
    db.commit()
    db.refresh(db_dividend)
    
    # Update position dividends_received
    position.dividends_received = (position.dividends_received or 0) + net_amount
    db.commit()
    
    return db_dividend

@router.get("/{dividend_id}", response_model=schemas.Dividend)
def get_dividend(
    dividend_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific dividend"""
    dividend = db.query(models.Dividend).join(models.Portfolio).filter(
        models.Dividend.id == dividend_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not dividend:
        raise HTTPException(status_code=404, detail="Dividend not found")
    
    return dividend

@router.put("/{dividend_id}", response_model=schemas.Dividend)
def update_dividend(
    dividend_id: int,
    dividend_update: schemas.DividendUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a dividend record"""
    dividend = db.query(models.Dividend).join(models.Portfolio).filter(
        models.Dividend.id == dividend_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not dividend:
        raise HTTPException(status_code=404, detail="Dividend not found")
    
    # Get old net amount for position update
    old_net_amount = dividend.net_amount or 0
    
    # Update dividend fields
    update_data = dividend_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dividend, field, value)
    
    # Recalculate amounts if relevant fields changed
    if any(field in update_data for field in ['amount_per_share', 'shares_quantity', 'gross_amount', 'tax_amount']):
        dividend.total_amount = dividend.amount_per_share * dividend.shares_quantity
        if dividend.gross_amount is None:
            dividend.gross_amount = dividend.total_amount
        dividend.net_amount = dividend.gross_amount - dividend.tax_amount
    
    dividend.updated_at = datetime.utcnow()
    
    # Update position dividends_received
    position = db.query(models.Position).filter(
        models.Position.id == dividend.position_id
    ).first()
    
    if position:
        new_net_amount = dividend.net_amount or 0
        position.dividends_received = (position.dividends_received or 0) - old_net_amount + new_net_amount
    
    db.commit()
    db.refresh(dividend)
    
    return dividend

@router.delete("/{dividend_id}")
def delete_dividend(
    dividend_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a dividend record"""
    dividend = db.query(models.Dividend).join(models.Portfolio).filter(
        models.Dividend.id == dividend_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not dividend:
        raise HTTPException(status_code=404, detail="Dividend not found")
    
    # Update position dividends_received
    position = db.query(models.Position).filter(
        models.Position.id == dividend.position_id
    ).first()
    
    if position and dividend.net_amount:
        position.dividends_received = (position.dividends_received or 0) - dividend.net_amount
    
    db.delete(dividend)
    db.commit()
    
    return {"message": "Dividend deleted successfully"}

@router.get("/portfolio/{portfolio_id}/projections", response_model=List[schemas.CashflowProjection])
def get_cashflow_projections(
    portfolio_id: int,
    months_ahead: int = Query(12, ge=1, le=60, description="Meses para projetar"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get cashflow projections for a portfolio"""
    
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get recurring dividends
    recurring_dividends = db.query(models.Dividend).filter(
        models.Dividend.portfolio_id == portfolio_id,
        models.Dividend.is_recurring == True
    ).all()
    
    projections = []
    current_date = datetime.now().date()
    end_date = current_date + timedelta(days=months_ahead * 30)
    
    for dividend in recurring_dividends:
        # Get asset symbol
        asset = db.query(models.Asset).filter(models.Asset.id == dividend.asset_id).first()
        if not asset:
            continue
            
        # Calculate projection dates based on frequency
        projection_date = dividend.payment_date
        
        while projection_date <= end_date:
            if projection_date >= current_date:
                projections.append(schemas.CashflowProjection(
                    date=projection_date.isoformat(),
                    amount=dividend.net_amount or dividend.total_amount,
                    dividend_type=dividend.dividend_type,
                    asset_symbol=asset.symbol,
                    frequency=dividend.frequency,
                    is_projected=True
                ))
            
            # Calculate next payment date based on frequency
            if dividend.frequency == models.PaymentFrequency.MONTHLY:
                projection_date = projection_date.replace(month=projection_date.month + 1) if projection_date.month < 12 else projection_date.replace(year=projection_date.year + 1, month=1)
            elif dividend.frequency == models.PaymentFrequency.QUARTERLY:
                month = projection_date.month + 3
                year = projection_date.year + (month - 1) // 12
                month = ((month - 1) % 12) + 1
                projection_date = projection_date.replace(year=year, month=month)
            elif dividend.frequency == models.PaymentFrequency.SEMIANNUAL:
                month = projection_date.month + 6
                year = projection_date.year + (month - 1) // 12
                month = ((month - 1) % 12) + 1
                projection_date = projection_date.replace(year=year, month=month)
            elif dividend.frequency == models.PaymentFrequency.ANNUAL:
                projection_date = projection_date.replace(year=projection_date.year + 1)
            else:
                break  # EVENTUAL - no projection
    
    # Sort by date
    projections.sort(key=lambda x: x.date)
    
    return projections
