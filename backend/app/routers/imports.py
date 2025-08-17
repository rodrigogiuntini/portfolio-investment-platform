from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import base64
from .. import models, auth
from ..database import get_db
from ..services import ImportService

router = APIRouter()

@router.post("/csv")
async def import_csv(
    portfolio_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Import transactions from CSV file"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Read file content
    content = await file.read()
    encoded_content = base64.b64encode(content).decode('utf-8')
    
    # Import data
    import_service = ImportService(db)
    success, message, count, errors = import_service.import_csv(portfolio_id, encoded_content)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": success,
        "message": message,
        "imported_count": count,
        "errors": errors
    }

@router.post("/excel")
async def import_excel(
    portfolio_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Import transactions from Excel file"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Read file content
    content = await file.read()
    encoded_content = base64.b64encode(content).decode('utf-8')
    
    # Import data
    import_service = ImportService(db)
    success, message, count, errors = import_service.import_excel(portfolio_id, encoded_content)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": success,
        "message": message,
        "imported_count": count,
        "errors": errors
    }

@router.post("/broker")
async def import_broker_extract(
    portfolio_id: int = Form(...),
    broker: str = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Import broker extract"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Read file content
    content = await file.read()
    encoded_content = base64.b64encode(content).decode('utf-8')
    
    # Import data
    import_service = ImportService(db)
    success, message, count, errors = import_service.import_broker_extract(
        portfolio_id, broker, encoded_content
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": success,
        "message": message,
        "imported_count": count,
        "errors": errors
    }

@router.get("/template/{format}")
def get_import_template(
    format: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get template file for imports"""
    if format == "csv":
        template = """date,symbol,type,quantity,price,total,fees,taxes
2024-01-15,PETR4,BUY,100,35.50,3550.00,10.00,0.00
2024-01-20,VALE3,BUY,50,70.25,3512.50,10.00,0.00
2024-02-01,PETR4,DIVIDEND,100,0.50,50.00,0.00,0.00
2024-02-15,PETR4,SELL,50,38.00,1900.00,10.00,5.00"""
        
        return {
            "format": "csv",
            "template": template,
            "instructions": [
                "date: Transaction date (YYYY-MM-DD)",
                "symbol: Asset ticker symbol",
                "type: BUY, SELL, DIVIDEND, DEPOSIT, WITHDRAW",
                "quantity: Number of shares (optional for deposits/withdrawals)",
                "price: Price per share (optional for deposits/withdrawals)",
                "total: Total transaction amount",
                "fees: Transaction fees (optional)",
                "taxes: Taxes (optional)"
            ]
        }
    
    elif format == "excel":
        return {
            "format": "excel",
            "columns": [
                "date", "symbol", "type", "quantity", "price", "total", "fees", "taxes"
            ],
            "instructions": [
                "Create an Excel file with the columns above",
                "Same format as CSV template"
            ]
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid format")

@router.get("/brokers")
def get_supported_brokers(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get list of supported brokers for import"""
    return {
        "brokers": [
            {"code": "xp", "name": "XP Investimentos"},
            {"code": "clear", "name": "Clear Corretora"},
            {"code": "btg", "name": "BTG Pactual"},
            {"code": "nuinvest", "name": "NuInvest"},
            {"code": "rico", "name": "Rico"},
            {"code": "inter", "name": "Banco Inter"}
        ]
    }
