from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .. import models, schemas, auth
from ..database import get_db
from ..services import PortfolioCalculator

router = APIRouter()

@router.get("/", response_model=List[schemas.Transaction])
def get_transactions(
    portfolio_id: Optional[int] = None,
    asset_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    transaction_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get transactions with filters"""
    query = db.query(models.Transaction).join(
        models.Portfolio
    ).filter(
        models.Portfolio.owner_id == current_user.id
    )
    
    if portfolio_id:
        query = query.filter(models.Transaction.portfolio_id == portfolio_id)
    
    if asset_id:
        query = query.filter(models.Transaction.asset_id == asset_id)
    
    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)
    
    if transaction_type:
        query = query.filter(models.Transaction.transaction_type == transaction_type)
    
    transactions = query.order_by(
        models.Transaction.date.desc()
    ).offset(skip).limit(limit).all()
    
    # Include asset information
    for transaction in transactions:
        if transaction.asset_id:
            transaction.asset = db.query(models.Asset).filter(
                models.Asset.id == transaction.asset_id
            ).first()
    
    return transactions

@router.post("/", response_model=schemas.Transaction)
def create_transaction(
    transaction: schemas.TransactionCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == transaction.portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Create transaction
    db_transaction = models.Transaction(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    # Process transaction to update positions
    calc = PortfolioCalculator(db)
    calc.process_transaction(db_transaction)
    
    # Include asset information
    if db_transaction.asset_id:
        db_transaction.asset = db.query(models.Asset).filter(
            models.Asset.id == db_transaction.asset_id
        ).first()
    
    return db_transaction

@router.get("/{transaction_id}", response_model=schemas.Transaction)
def get_transaction(
    transaction_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific transaction"""
    transaction = db.query(models.Transaction).join(
        models.Portfolio
    ).filter(
        models.Transaction.id == transaction_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Include asset information
    if transaction.asset_id:
        transaction.asset = db.query(models.Asset).filter(
            models.Asset.id == transaction.asset_id
        ).first()
    
    return transaction

@router.put("/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(
    transaction_id: int,
    transaction_update: schemas.TransactionUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a transaction"""
    transaction = db.query(models.Transaction).join(
        models.Portfolio
    ).filter(
        models.Transaction.id == transaction_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    for field, value in transaction_update.dict(exclude_unset=True).items():
        setattr(transaction, field, value)
    
    db.commit()
    db.refresh(transaction)
    
    # Recalculate positions
    calc = PortfolioCalculator(db)
    
    # Recalculate all positions for this portfolio
    positions = db.query(models.Position).filter(
        models.Position.portfolio_id == transaction.portfolio_id
    ).all()
    
    for position in positions:
        calc.update_position(position)
    
    return transaction

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction"""
    transaction = db.query(models.Transaction).join(
        models.Portfolio
    ).filter(
        models.Transaction.id == transaction_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    portfolio_id = transaction.portfolio_id
    
    db.delete(transaction)
    db.commit()
    
    # Recalculate positions
    calc = PortfolioCalculator(db)
    
    # Recalculate all positions for this portfolio
    positions = db.query(models.Position).filter(
        models.Position.portfolio_id == portfolio_id
    ).all()
    
    for position in positions:
        calc.update_position(position)
    
    return {"message": "Transaction deleted successfully"}

@router.post("/batch")
def create_batch_transactions(
    transactions: List[schemas.TransactionCreate],
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create multiple transactions at once"""
    created_transactions = []
    calc = PortfolioCalculator(db)
    
    for transaction_data in transactions:
        # Verify portfolio ownership
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.id == transaction_data.portfolio_id,
            models.Portfolio.owner_id == current_user.id
        ).first()
        
        if not portfolio:
            continue
        
        # Create transaction
        db_transaction = models.Transaction(**transaction_data.dict())
        db.add(db_transaction)
        created_transactions.append(db_transaction)
    
    db.commit()
    
    # Process all transactions
    for transaction in created_transactions:
        calc.process_transaction(transaction)
    
    return {
        "message": f"Created {len(created_transactions)} transactions",
        "count": len(created_transactions)
    }
