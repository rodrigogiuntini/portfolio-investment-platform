from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from .. import models, schemas, auth
from ..database import get_db
from ..services import PortfolioCalculator, MarketDataService

router = APIRouter()

@router.get("/", response_model=schemas.DashboardData)
def get_dashboard(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get dashboard data for current user"""
    calc = PortfolioCalculator(db)
    
    # Get all portfolios
    portfolios = db.query(models.Portfolio).filter(
        models.Portfolio.owner_id == current_user.id
    ).all()
    
    portfolio_summaries = []
    total_patrimony = 0
    total_invested = 0
    total_return = 0
    
    # Calculate values for each portfolio
    for portfolio in portfolios:
        values = calc.calculate_portfolio_value(portfolio.id)
        
        summary = schemas.PortfolioSummary(
            portfolio_id=portfolio.id,
            portfolio_name=portfolio.name,
            total_value=values.get('total_value', 0),
            total_invested=values.get('total_invested', 0),
            total_return=values.get('total_return', 0),
            total_return_percentage=values.get('total_return_percentage', 0),
            currency=portfolio.currency.value,
            positions_count=values.get('positions_count', 0),
            last_update=datetime.utcnow()
        )
        
        portfolio_summaries.append(summary)
        
        # Convert to BRL for total calculation (simplified - should use exchange rates)
        if portfolio.currency == models.Currency.BRL:
            total_patrimony += values.get('total_value', 0)
            total_invested += values.get('total_invested', 0)
            total_return += values.get('total_return', 0)
    
    # Calculate total asset allocation across all portfolios
    allocation_map = {}
    
    for portfolio in portfolios:
        allocations = calc.calculate_asset_allocation(portfolio.id)
        for alloc in allocations:
            asset_type = alloc['asset_type']
            if asset_type not in allocation_map:
                allocation_map[asset_type] = {'value': 0, 'count': 0}
            allocation_map[asset_type]['value'] += alloc['value']
            allocation_map[asset_type]['count'] += alloc['count']
    
    asset_allocation = []
    for asset_type, data in allocation_map.items():
        percentage = (data['value'] / total_patrimony * 100) if total_patrimony > 0 else 0
        asset_allocation.append(schemas.AssetAllocation(
            asset_type=asset_type,
            value=data['value'],
            percentage=percentage,
            count=data['count']
        ))
    
    # Calculate overall performance metrics (simplified)
    total_return_percentage = (total_return / total_invested * 100) if total_invested > 0 else 0
    
    performance_metrics = schemas.PerformanceMetrics(
        daily_return=None,  # Would need historical data
        monthly_return=None,  # Would need historical data
        yearly_return=total_return_percentage,  # Simplified
        volatility=None,
        sharpe_ratio=None,
        max_drawdown=None,
        beta=None,
        alpha=None
    )
    
    # Get recent transactions
    recent_transactions = db.query(models.Transaction).join(
        models.Portfolio
    ).filter(
        models.Portfolio.owner_id == current_user.id
    ).order_by(
        models.Transaction.created_at.desc()
    ).limit(10).all()
    
    # Include asset information
    for transaction in recent_transactions:
        if transaction.asset_id:
            transaction.asset = db.query(models.Asset).filter(
                models.Asset.id == transaction.asset_id
            ).first()
    
    return schemas.DashboardData((
        portfolios=portfolio_summaries,
        total_patrimony=total_patrimony,
        total_invested=total_invested,
        total_return=total_return,
        total_return_percentage=total_return_percentage,
        asset_allocation=asset_allocation,
        performance_metrics=performance_metrics,
        recent_transactions=recent_transactions
    )

@router.get("/evolution")
def get_portfolio_evolution(
    portfolio_id: Optional[int] = None,
    period: str = Query("1y", description="Period: 1m, 3m, 6m, 1y, 3y, 5y, all"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get portfolio value evolution over time"""
    # Determine period
    period_map = {
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365,
        "3y": 1095,
        "5y": 1825,
        "all": 10000
    }
    
    days = period_map.get(period, 365)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    calc = PortfolioCalculator(db)
    
    if portfolio_id:
        # Get evolution for specific portfolio
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.id == portfolio_id,
            models.Portfolio.owner_id == current_user.id
        ).first()
        
        if not portfolio:
            return {"error": "Portfolio not found"}
        
        # Build sample values (optimized for performance)
        evolution_data = []
        
        # Sample data points instead of daily calculations
        sample_dates = [
            start_date,
            start_date + timedelta(days=days//4),
            start_date + timedelta(days=days//2),
            start_date + timedelta(days=3*days//4),
            end_date
        ]
        
        for sample_date in sample_dates:
            if sample_date <= end_date:
                # Use current value as approximation to avoid expensive historical calculations
                values = calc.calculate_portfolio_value(portfolio_id)
                value = values.get('total_value', 0)
                if value > 0:
                    evolution_data.append({
                        "date": sample_date.isoformat(),
                        "value": value
                    })
        
        return {"portfolio_id": portfolio_id, "data": evolution_data}
    
    else:
        # Get evolution for all portfolios combined (simplified for performance)
        portfolios = db.query(models.Portfolio).filter(
            models.Portfolio.owner_id == current_user.id
        ).all()
        
        # For now, return a simplified evolution based on current values
        # TODO: Implement proper historical data tracking for better performance
        evolution_data = []
        
        # Sample data points instead of daily calculations to avoid performance issues
        sample_dates = [
            start_date,
            start_date + timedelta(days=days//4),
            start_date + timedelta(days=days//2),
            start_date + timedelta(days=3*days//4),
            end_date
        ]
        
        for sample_date in sample_dates:
            if sample_date <= end_date:
                # Get current portfolio values as approximation
                total_value = 0
                for portfolio in portfolios:
                    values = calc.calculate_portfolio_value(portfolio.id)
                    # Simplified - should convert using exchange rates
                    if portfolio.currency == models.Currency.BRL:
                        total_value += values.get('total_value', 0)
                
                if total_value > 0:
                    evolution_data.append({
                        "date": sample_date.isoformat(),
                        "value": total_value
                    })
        
        return {"data": evolution_data}

@router.get("/benchmark-comparison")
def get_benchmark_comparison(
    portfolio_id: int,
    benchmark: str = "CDI",
    period: str = "1y",
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Compare portfolio performance with benchmark"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        return {"error": "Portfolio not found"}
    
    # Update benchmark data
    market_service = MarketDataService(db)
    market_service.update_benchmark_data(benchmark, period)
    
    # Get benchmark data
    period_map = {
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365,
        "3y": 1095,
        "5y": 1825
    }
    
    days = period_map.get(period, 365)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    benchmark_data = db.query(models.Benchmark).filter(
        models.Benchmark.symbol == benchmark,
        models.Benchmark.date >= start_date,
        models.Benchmark.date <= end_date
    ).order_by(models.Benchmark.date).all()
    
    # Calculate portfolio performance
    calc = PortfolioCalculator(db)
    metrics = calc.calculate_performance_metrics(portfolio_id, days)
    
    # Format benchmark data
    benchmark_values = []
    for bench in benchmark_data:
        benchmark_values.append({
            "date": bench.date.isoformat(),
            "value": bench.value
        })
    
    return {
        "portfolio_performance": metrics,
        "benchmark": benchmark,
        "benchmark_data": benchmark_values
    }

@router.get("/alerts")
def get_active_alerts(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get active alerts for current user"""
    alerts = db.query(models.Alert).filter(
        models.Alert.user_id == current_user.id,
        models.Alert.is_active == True
    ).all()
    
    # Check alert conditions and generate messages
    alert_messages = []
    calc = PortfolioCalculator(db)
    
    for alert in alerts:
        # Example alert checking logic
        if alert.alert_type == "concentration":
            # Check if any asset exceeds concentration limit
            portfolios = db.query(models.Portfolio).filter(
                models.Portfolio.owner_id == current_user.id
            ).all()
            
            for portfolio in portfolios:
                allocations = calc.calculate_asset_allocation(portfolio.id)
                for alloc in allocations:
                    if alloc['percentage'] > alert.condition.get('max_percentage', 30):
                        alert_messages.append({
                            "type": "warning",
                            "message": f"High concentration alert: {alloc['asset_type']} is {alloc['percentage']:.1f}% of portfolio {portfolio.name}"
                        })
        
        elif alert.alert_type == "volatility":
            # Check portfolio volatility
            pass  # Would implement volatility check
        
        elif alert.alert_type == "drawdown":
            # Check for significant drawdowns
            pass  # Would implement drawdown check
    
    return {"alerts": alert_messages}
