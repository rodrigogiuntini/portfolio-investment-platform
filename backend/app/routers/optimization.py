from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import math
import random

from .. import models, auth
from ..database import get_db

router = APIRouter()

# Pydantic models
class OptimizationRequest(BaseModel):
    portfolio_id: int
    method: str = "max_sharpe"  # max_sharpe, max_sortino, min_risk, max_return
    risk_tolerance: int = 5  # 1-10 scale
    time_horizon: int = 12  # months
    constraints: Optional[Dict[str, Any]] = None

class OptimizationResponse(BaseModel):
    weights: Dict[str, float]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    sortino_ratio: Optional[float] = None
    efficient_frontier: List[Dict[str, Any]]

class MonteCarloRequest(BaseModel):
    portfolio_id: int
    optimization_weights: Dict[str, float]
    time_horizon: int = 12
    num_simulations: int = 10000
    initial_value: float = 100000

class MonteCarloResponse(BaseModel):
    scenarios: List[Dict[str, Any]]
    statistics: Dict[str, float]

def calculate_returns_and_covariance(positions: List[models.Position]) -> tuple:
    """
    Calculate expected returns and covariance matrix for portfolio positions.
    In a real implementation, this would use historical price data.
    For now, we'll use mock data based on asset characteristics.
    """
    symbols = [pos.asset.symbol for pos in positions]
    n_assets = len(symbols)
    
    # Mock expected returns (annualized)
    expected_returns = {}
    for pos in positions:
        # Base return on asset type and current performance
        base_return = 0.10  # 10% base
        if pos.asset.asset_type == "STOCK":
            base_return = 0.12
        elif pos.asset.asset_type == "REIT":
            base_return = 0.08
        elif pos.asset.asset_type == "BOND":
            base_return = 0.06
        
        # Add some randomness based on current performance
        performance_factor = (pos.total_return_percentage or 0) / 100 * 0.1
        expected_returns[pos.asset.symbol] = base_return + performance_factor
    
    # Mock covariance matrix
    # In reality, this would be calculated from historical returns
    volatilities = {}
    for pos in positions:
        # Base volatility on asset type
        base_vol = 0.20  # 20% base volatility
        if pos.asset.asset_type == "STOCK":
            base_vol = 0.25
        elif pos.asset.asset_type == "REIT":
            base_vol = 0.18
        elif pos.asset.asset_type == "BOND":
            base_vol = 0.08
        
        volatilities[pos.asset.symbol] = base_vol
    
    # Create correlation matrix (simplified)
    correlation_matrix = np.eye(n_assets)
    for i in range(n_assets):
        for j in range(i+1, n_assets):
            # Same sector assets have higher correlation
            if positions[i].asset.sector == positions[j].asset.sector:
                correlation = 0.6 + random.random() * 0.2  # 0.6-0.8
            else:
                correlation = 0.1 + random.random() * 0.3  # 0.1-0.4
            correlation_matrix[i][j] = correlation
            correlation_matrix[j][i] = correlation
    
    # Convert to covariance matrix
    vol_array = np.array([volatilities[symbol] for symbol in symbols])
    covariance_matrix = np.outer(vol_array, vol_array) * correlation_matrix
    
    return expected_returns, covariance_matrix, symbols

def optimize_portfolio(expected_returns: Dict[str, float], 
                      covariance_matrix: np.ndarray, 
                      symbols: List[str],
                      method: str = "max_sharpe") -> Dict[str, float]:
    """
    Perform portfolio optimization using simplified Markowitz theory.
    In a real implementation, this would use scipy.optimize or cvxpy.
    """
    n_assets = len(symbols)
    
    if method == "max_sharpe":
        # Simplified maximum Sharpe ratio optimization
        # In reality, this would solve: max (μ'w - rf) / sqrt(w'Σw)
        returns_array = np.array([expected_returns[symbol] for symbol in symbols])
        
        # Inverse volatility weighting as approximation
        inv_vol = 1 / np.sqrt(np.diag(covariance_matrix))
        weights = inv_vol / np.sum(inv_vol)
        
    elif method == "max_sortino":
        # Maximum Sortino ratio optimization
        # Sortino ratio considers only downside deviation (negative volatility)
        # In reality, this would solve: max (μ'w - rf) / sqrt(w'Σ_downside*w)
        returns_array = np.array([expected_returns[symbol] for symbol in symbols])
        
        # Simulate downside volatility (simplified approach)
        # In practice, this would be calculated from historical negative returns
        downside_vol = np.sqrt(np.diag(covariance_matrix)) * 0.7  # Assume 70% of total vol is downside
        
        # Weight by inverse downside volatility
        inv_downside_vol = 1 / downside_vol
        weights = inv_downside_vol / np.sum(inv_downside_vol)
        
        # Adjust for expected returns (favor higher return assets)
        return_adjustment = returns_array / np.sum(returns_array)
        weights = (weights + return_adjustment) / 2
        
    elif method == "min_risk":
        # Minimum variance portfolio
        # In reality: min w'Σw subject to w'1 = 1
        inv_cov_sum = np.sum(np.linalg.inv(covariance_matrix), axis=1)
        weights = inv_cov_sum / np.sum(inv_cov_sum)
        
    elif method == "max_return":
        # Maximum return (equal weight as approximation)
        weights = np.ones(n_assets) / n_assets
        
    else:
        # Default to equal weights
        weights = np.ones(n_assets) / n_assets
    
    # Ensure weights sum to 1 and are non-negative
    weights = np.maximum(weights, 0.01)  # Minimum 1% allocation
    weights = weights / np.sum(weights)
    
    return dict(zip(symbols, weights))

def generate_efficient_frontier(expected_returns: Dict[str, float], 
                               covariance_matrix: np.ndarray, 
                               symbols: List[str],
                               num_points: int = 20) -> List[Dict[str, Any]]:
    """
    Generate points on the efficient frontier.
    Simplified implementation for demonstration.
    """
    frontier_points = []
    returns_array = np.array([expected_returns[symbol] for symbol in symbols])
    
    # Generate risk levels from minimum to maximum
    min_vol = 0.05
    max_vol = 0.40
    
    for i in range(num_points):
        target_vol = min_vol + (max_vol - min_vol) * i / (num_points - 1)
        
        # Simplified: generate weights that approximately target this volatility
        # In reality, this would solve the optimization problem for each target
        base_weights = np.random.dirichlet(np.ones(len(symbols)))
        
        # Calculate portfolio metrics
        portfolio_return = np.dot(base_weights, returns_array)
        portfolio_vol = np.sqrt(np.dot(base_weights, np.dot(covariance_matrix, base_weights)))
        
        # Adjust to approximate target volatility
        vol_adjustment = target_vol / portfolio_vol if portfolio_vol > 0 else 1
        adjusted_weights = base_weights * vol_adjustment
        adjusted_weights = adjusted_weights / np.sum(adjusted_weights)
        
        # Recalculate with adjusted weights
        portfolio_return = np.dot(adjusted_weights, returns_array)
        portfolio_vol = target_vol  # Use target for consistency
        sharpe_ratio = portfolio_return / portfolio_vol if portfolio_vol > 0 else 0
        
        frontier_points.append({
            "return": portfolio_return,
            "risk": portfolio_vol,
            "sharpe": sharpe_ratio,
            "weights": dict(zip(symbols, adjusted_weights))
        })
    
    return sorted(frontier_points, key=lambda x: x["risk"])

@router.post("/optimize", response_model=OptimizationResponse)
def optimize_portfolio_endpoint(
    request: OptimizationRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Optimize portfolio allocation using Markowitz theory"""
    
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == request.portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get portfolio positions
    positions = db.query(models.Position).filter(
        models.Position.portfolio_id == request.portfolio_id
    ).all()
    
    if len(positions) < 2:
        raise HTTPException(
            status_code=400, 
            detail="Portfolio must have at least 2 positions for optimization"
        )
    
    try:
        # Calculate returns and covariance
        expected_returns, covariance_matrix, symbols = calculate_returns_and_covariance(positions)
        
        # Optimize portfolio
        optimal_weights = optimize_portfolio(
            expected_returns, 
            covariance_matrix, 
            symbols, 
            request.method
        )
        
        # Calculate portfolio metrics
        returns_array = np.array([expected_returns[symbol] for symbol in symbols])
        weights_array = np.array([optimal_weights[symbol] for symbol in symbols])
        
        portfolio_return = np.dot(weights_array, returns_array)
        portfolio_vol = np.sqrt(np.dot(weights_array, np.dot(covariance_matrix, weights_array)))
        sharpe_ratio = portfolio_return / portfolio_vol if portfolio_vol > 0 else 0
        
        # Calculate Sortino ratio (using downside deviation)
        risk_free_rate = 0.05  # 5% risk-free rate
        downside_vol = portfolio_vol * 0.7  # Simplified: assume 70% of volatility is downside
        sortino_ratio = (portfolio_return - risk_free_rate) / downside_vol if downside_vol > 0 else 0
        
        # Generate efficient frontier
        efficient_frontier = generate_efficient_frontier(
            expected_returns, 
            covariance_matrix, 
            symbols
        )
        
        return OptimizationResponse(
            weights=optimal_weights,
            expected_return=portfolio_return,
            volatility=portfolio_vol,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            efficient_frontier=efficient_frontier
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@router.post("/monte-carlo", response_model=MonteCarloResponse)
def monte_carlo_simulation(
    request: MonteCarloRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Run Monte Carlo simulation for portfolio risk analysis"""
    
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == request.portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get portfolio positions
    positions = db.query(models.Position).filter(
        models.Position.portfolio_id == request.portfolio_id
    ).all()
    
    if not positions:
        raise HTTPException(status_code=400, detail="Portfolio has no positions")
    
    try:
        # Get expected returns and covariance
        expected_returns, covariance_matrix, symbols = calculate_returns_and_covariance(positions)
        
        # Convert weights to array
        weights_array = np.array([
            request.optimization_weights.get(symbol, 0) for symbol in symbols
        ])
        
        # Normalize weights
        if np.sum(weights_array) > 0:
            weights_array = weights_array / np.sum(weights_array)
        else:
            weights_array = np.ones(len(symbols)) / len(symbols)
        
        # Portfolio expected return and volatility
        returns_array = np.array([expected_returns[symbol] for symbol in symbols])
        portfolio_return = np.dot(weights_array, returns_array)
        portfolio_vol = np.sqrt(np.dot(weights_array, np.dot(covariance_matrix, weights_array)))
        
        # Run Monte Carlo simulation
        scenarios = []
        returns_list = []
        
        np.random.seed(42)  # For reproducible results
        
        for _ in range(min(request.num_simulations, 10000)):  # Limit for performance
            # Generate random returns for the time horizon
            monthly_return = portfolio_return / 12
            monthly_vol = portfolio_vol / np.sqrt(12)
            
            # Generate path
            path = [request.initial_value]
            for month in range(request.time_horizon):
                random_return = np.random.normal(monthly_return, monthly_vol)
                new_value = path[-1] * (1 + random_return)
                path.append(new_value)
            
            final_value = path[-1]
            total_return = (final_value - request.initial_value) / request.initial_value * 100
            
            scenarios.append({
                "final_value": final_value,
                "return_percentage": total_return,
                "path": path[1:]  # Exclude initial value
            })
            returns_list.append(total_return)
        
        # Calculate statistics
        returns_array = np.array(returns_list)
        returns_sorted = np.sort(returns_array)
        
        statistics = {
            "mean_return": float(np.mean(returns_array)),
            "std_return": float(np.std(returns_array)),
            "var_95": float(np.percentile(returns_sorted, 5)),
            "var_99": float(np.percentile(returns_sorted, 1)),
            "probability_of_loss": float(np.sum(returns_array < 0) / len(returns_array) * 100),
            "best_case": float(np.max(returns_array)),
            "worst_case": float(np.min(returns_array))
        }
        
        return MonteCarloResponse(
            scenarios=scenarios[:1000],  # Return subset for performance
            statistics=statistics
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Monte Carlo simulation failed: {str(e)}")

@router.get("/portfolio/{portfolio_id}/risk-metrics")
def get_portfolio_risk_metrics(
    portfolio_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current portfolio risk metrics"""
    
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.owner_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get portfolio positions
    positions = db.query(models.Position).filter(
        models.Position.portfolio_id == portfolio_id
    ).all()
    
    if not positions:
        return {
            "portfolio_id": portfolio_id,
            "total_value": 0,
            "volatility": 0,
            "beta": 0,
            "sharpe_ratio": 0,
            "diversification_ratio": 0,
            "concentration_risk": 0
        }
    
    try:
        # Calculate current portfolio metrics
        total_value = sum(pos.current_value or 0 for pos in positions)
        
        # Current weights
        current_weights = {}
        for pos in positions:
            weight = (pos.current_value or 0) / total_value if total_value > 0 else 0
            current_weights[pos.asset.symbol] = weight
        
        # Get returns and covariance
        expected_returns, covariance_matrix, symbols = calculate_returns_and_covariance(positions)
        
        # Calculate portfolio volatility
        weights_array = np.array([current_weights.get(symbol, 0) for symbol in symbols])
        portfolio_vol = np.sqrt(np.dot(weights_array, np.dot(covariance_matrix, weights_array)))
        
        # Calculate concentration risk (Herfindahl index)
        concentration_risk = sum(w**2 for w in current_weights.values())
        
        # Diversification ratio (simplified)
        avg_vol = np.mean(np.sqrt(np.diag(covariance_matrix)))
        diversification_ratio = avg_vol / portfolio_vol if portfolio_vol > 0 else 1
        
        # Mock beta and Sharpe ratio
        portfolio_return = np.dot(weights_array, [expected_returns[s] for s in symbols])
        risk_free_rate = 0.05  # 5% risk-free rate
        sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_vol if portfolio_vol > 0 else 0
        
        return {
            "portfolio_id": portfolio_id,
            "total_value": total_value,
            "volatility": portfolio_vol,
            "beta": 1.0 + (portfolio_vol - 0.15) / 0.10,  # Simplified beta calculation
            "sharpe_ratio": sharpe_ratio,
            "diversification_ratio": diversification_ratio,
            "concentration_risk": concentration_risk,
            "current_weights": current_weights
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk metrics calculation failed: {str(e)}")
