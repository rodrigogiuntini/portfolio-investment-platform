from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas, auth
from ..database import get_db
from ..services import MarketDataService

router = APIRouter()

@router.get("/", response_model=List[schemas.Asset])
def get_assets(
    skip: int = 0,
    limit: int = 100,
    asset_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all assets"""
    try:
        query = db.query(models.Asset)
        
        if asset_type:
            query = query.filter(models.Asset.asset_type == asset_type)
        
        if search:
            query = query.filter(
                (models.Asset.symbol.contains(search.upper())) |
                (models.Asset.name.contains(search))
            )
        
        assets = query.offset(skip).limit(limit).all()
        
        # Try to add current prices, but don't fail if Price table doesn't exist
        try:
            for asset in assets:
                latest_price = db.query(models.Price).filter(
                    models.Price.asset_id == asset.id
                ).order_by(models.Price.date.desc()).first()
                
                if latest_price:
                    asset.current_price = latest_price.close
                else:
                    asset.current_price = None
        except Exception as e:
            # If Price table doesn't exist, just continue without prices
            print(f"Warning: Could not fetch prices: {e}")
            for asset in assets:
                asset.current_price = None
        
        return assets
    except Exception as e:
        print(f"Error in get_assets: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching assets: {str(e)}")

@router.post("/", response_model=schemas.Asset)
def create_asset(
    asset: schemas.AssetCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new asset"""
    # Check if asset already exists
    existing = db.query(models.Asset).filter(
        models.Asset.symbol == asset.symbol.upper()
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Asset already exists")
    
    db_asset = models.Asset(**asset.dict())
    db_asset.symbol = db_asset.symbol.upper()
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    # Try to update price
    market_service = MarketDataService(db)
    market_service.update_asset_price(db_asset)
    
    return db_asset

@router.get("/search")
def search_assets(
    q: str = Query(..., description="Search query"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Search for assets by symbol or name using external APIs (Brapi + Yahoo Finance)"""
    try:
        market_service = MarketDataService(db)
        results = market_service.search_asset(q)
        
        # Convert to response format
        formatted_results = []
        for asset_data in results:
            formatted_results.append({
                'id': None,  # Not in database yet
                'symbol': asset_data.get('symbol'),
                'name': asset_data.get('name'),
                'asset_type': asset_data.get('asset_type', 'STOCK'),
                'sector': asset_data.get('sector'),
                'exchange': asset_data.get('exchange'),
                'currency': asset_data.get('currency', 'BRL'),
                'current_price': asset_data.get('current_price'),
                'market_cap': asset_data.get('market_cap'),
                'industry': asset_data.get('industry')
            })
        
        return formatted_results
        
    except Exception as e:
        print(f"Error searching assets: {str(e)}")
        return []

@router.get("/{asset_id}", response_model=schemas.Asset)
def get_asset(
    asset_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific asset"""
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Add current price
    latest_price = db.query(models.Price).filter(
        models.Price.asset_id == asset.id
    ).order_by(models.Price.date.desc()).first()
    
    if latest_price:
        asset.current_price = latest_price.close
    
    return asset

@router.put("/{asset_id}", response_model=schemas.Asset)
def update_asset(
    asset_id: int,
    asset_update: schemas.AssetUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an asset"""
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    for field, value in asset_update.dict(exclude_unset=True).items():
        setattr(asset, field, value)
    
    db.commit()
    db.refresh(asset)
    return asset

@router.post("/{asset_id}/update-price")
def update_asset_price(
    asset_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Force update of asset price"""
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    market_service = MarketDataService(db)
    price = market_service.update_asset_price(asset)
    
    if price:
        return {"message": "Price updated successfully", "price": price}
    else:
        raise HTTPException(status_code=500, detail="Failed to update price")

@router.post("/{asset_id}/update-history")
def update_asset_history(
    asset_id: int,
    period: str = "1mo",
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update historical prices for an asset"""
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    market_service = MarketDataService(db)
    success = market_service.update_historical_prices(asset, period)
    
    if success:
        return {"message": "Historical prices updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to update historical prices")

@router.get("/{asset_id}/prices", response_model=List[schemas.Price])
def get_asset_prices(
    asset_id: int,
    limit: int = 30,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get price history for an asset"""
    prices = db.query(models.Price).filter(
        models.Price.asset_id == asset_id
    ).order_by(models.Price.date.desc()).limit(limit).all()
    
    return prices

@router.post("/batch-update-prices")
def batch_update_prices(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update prices for all assets in user's portfolios"""
    # Get all unique assets from user's portfolios
    assets = db.query(models.Asset).join(
        models.Position
    ).join(
        models.Portfolio
    ).filter(
        models.Portfolio.owner_id == current_user.id
    ).distinct().all()
    
    market_service = MarketDataService(db)
    updated_count = 0
    failed_count = 0
    
    for asset in assets:
        price = market_service.update_asset_price(asset)
        if price:
            updated_count += 1
        else:
            failed_count += 1
    
    return {
        "message": "Batch update completed",
        "updated": updated_count,
        "failed": failed_count
    }
