import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models
import logging

logger = logging.getLogger(__name__)

class PortfolioCalculator:
    def __init__(self, db: Session):
        self.db = db
    
    def update_position(self, position: models.Position) -> models.Position:
        """Update position calculations"""
        try:
            # Get latest price
            latest_price = self.db.query(models.Price).filter(
                models.Price.asset_id == position.asset_id
            ).order_by(models.Price.date.desc()).first()
            
            if latest_price:
                position.current_price = latest_price.close
                position.current_value = position.quantity * latest_price.close
                position.unrealized_pnl = position.current_value - position.total_invested
            
            position.last_updated = datetime.utcnow()
            self.db.commit()
            
            return position
            
        except Exception as e:
            logger.error(f"Error updating position {position.id}: {str(e)}")
            return position
    
    def calculate_portfolio_value(self, portfolio_id: int) -> Dict:
        """Calculate total portfolio value and returns"""
        try:
            positions = self.db.query(models.Position).filter(
                models.Position.portfolio_id == portfolio_id
            ).all()
            
            total_invested = 0
            total_value = 0
            total_dividends = 0
            
            for position in positions:
                self.update_position(position)
                total_invested += position.total_invested
                total_value += position.current_value or 0
                total_dividends += position.dividends_received
            
            total_return = total_value - total_invested + total_dividends
            total_return_percentage = (total_return / total_invested * 100) if total_invested > 0 else 0
            
            return {
                'total_invested': total_invested,
                'total_value': total_value,
                'total_dividends': total_dividends,
                'total_return': total_return,
                'total_return_percentage': total_return_percentage,
                'positions_count': len(positions)
            }
            
        except Exception as e:
            logger.error(f"Error calculating portfolio {portfolio_id}: {str(e)}")
            return {}
    
    def calculate_asset_allocation(self, portfolio_id: int) -> List[Dict]:
        """Calculate asset allocation by type"""
        try:
            positions = self.db.query(models.Position).join(
                models.Asset
            ).filter(
                models.Position.portfolio_id == portfolio_id
            ).all()
            
            allocation = {}
            total_value = 0
            
            for position in positions:
                asset_type = position.asset.asset_type.value
                value = position.current_value or 0
                
                if asset_type not in allocation:
                    allocation[asset_type] = {'value': 0, 'count': 0}
                
                allocation[asset_type]['value'] += value
                allocation[asset_type]['count'] += 1
                total_value += value
            
            result = []
            for asset_type, data in allocation.items():
                percentage = (data['value'] / total_value * 100) if total_value > 0 else 0
                result.append({
                    'asset_type': asset_type,
                    'value': data['value'],
                    'percentage': percentage,
                    'count': data['count']
                })
            
            return sorted(result, key=lambda x: x['value'], reverse=True)
            
        except Exception as e:
            logger.error(f"Error calculating allocation for portfolio {portfolio_id}: {str(e)}")
            return []
    
    def calculate_performance_metrics(self, portfolio_id: int, period_days: int = 365) -> Dict:
        """Calculate portfolio performance metrics"""
        try:
            # Get transactions history
            end_date = date.today()
            start_date = end_date - timedelta(days=period_days)
            
            transactions = self.db.query(models.Transaction).filter(
                models.Transaction.portfolio_id == portfolio_id,
                models.Transaction.date >= start_date
            ).order_by(models.Transaction.date).all()
            
            if not transactions:
                return {}
            
            # Build daily portfolio values
            daily_values = []
            dates = []
            
            current_date = start_date
            while current_date <= end_date:
                portfolio_value = self._get_portfolio_value_at_date(portfolio_id, current_date)
                if portfolio_value > 0:
                    daily_values.append(portfolio_value)
                    dates.append(current_date)
                current_date += timedelta(days=1)
            
            if len(daily_values) < 2:
                return {}
            
            # Convert to numpy array for calculations
            values = np.array(daily_values)
            
            # Calculate returns
            returns = np.diff(values) / values[:-1]
            
            # Calculate metrics
            daily_return = returns[-1] if len(returns) > 0 else 0
            total_return = (values[-1] - values[0]) / values[0]
            
            # Annualized metrics
            trading_days = len(returns)
            yearly_return = (1 + total_return) ** (252 / trading_days) - 1 if trading_days > 0 else 0
            
            # Volatility (annualized standard deviation)
            volatility = np.std(returns) * np.sqrt(252) if len(returns) > 1 else 0
            
            # Sharpe Ratio (assuming risk-free rate of 11.65% for CDI)
            risk_free_rate = 0.1165
            excess_return = yearly_return - risk_free_rate
            sharpe_ratio = excess_return / volatility if volatility > 0 else 0
            
            # Max Drawdown
            cumulative_returns = (1 + returns).cumprod()
            running_max = np.maximum.accumulate(cumulative_returns)
            drawdown = (cumulative_returns - running_max) / running_max
            max_drawdown = np.min(drawdown) if len(drawdown) > 0 else 0
            
            # Monthly return (last 30 days)
            monthly_start = max(0, len(values) - 30)
            monthly_return = (values[-1] - values[monthly_start]) / values[monthly_start] if monthly_start < len(values) else 0
            
            return {
                'daily_return': daily_return * 100,
                'monthly_return': monthly_return * 100,
                'yearly_return': yearly_return * 100,
                'volatility': volatility * 100,
                'sharpe_ratio': sharpe_ratio,
                'max_drawdown': max_drawdown * 100,
                'beta': None,  # Would need market data to calculate
                'alpha': None  # Would need market data to calculate
            }
            
        except Exception as e:
            logger.error(f"Error calculating performance metrics: {str(e)}")
            return {}
    
    def _get_portfolio_value_at_date(self, portfolio_id: int, target_date: date) -> float:
        """Get portfolio value at a specific date"""
        try:
            # Get all transactions up to the target date
            transactions = self.db.query(models.Transaction).filter(
                models.Transaction.portfolio_id == portfolio_id,
                models.Transaction.date <= target_date
            ).all()
            
            # Build positions from transactions
            positions = {}
            cash = 0
            
            for transaction in transactions:
                if transaction.transaction_type == models.TransactionType.DEPOSIT:
                    cash += transaction.total_amount
                elif transaction.transaction_type == models.TransactionType.WITHDRAW:
                    cash -= transaction.total_amount
                elif transaction.transaction_type == models.TransactionType.BUY:
                    if transaction.asset_id:
                        if transaction.asset_id not in positions:
                            positions[transaction.asset_id] = 0
                        positions[transaction.asset_id] += transaction.quantity
                        cash -= transaction.total_amount
                elif transaction.transaction_type == models.TransactionType.SELL:
                    if transaction.asset_id and transaction.asset_id in positions:
                        positions[transaction.asset_id] -= transaction.quantity
                        cash += transaction.total_amount
                elif transaction.transaction_type == models.TransactionType.DIVIDEND:
                    cash += transaction.total_amount
            
            # Calculate total value
            total_value = cash
            
            for asset_id, quantity in positions.items():
                if quantity > 0:
                    # Get price at target date
                    price = self.db.query(models.Price).filter(
                        models.Price.asset_id == asset_id,
                        models.Price.date <= target_date
                    ).order_by(models.Price.date.desc()).first()
                    
                    if price:
                        total_value += quantity * price.close
            
            return total_value
            
        except Exception as e:
            logger.error(f"Error getting portfolio value at {target_date}: {str(e)}")
            return 0
    
    def process_transaction(self, transaction: models.Transaction):
        """Process a new transaction and update positions"""
        try:
            if transaction.transaction_type in [models.TransactionType.BUY, models.TransactionType.SELL]:
                # Find or create position
                position = self.db.query(models.Position).filter(
                    models.Position.portfolio_id == transaction.portfolio_id,
                    models.Position.asset_id == transaction.asset_id
                ).first()
                
                if not position:
                    position = models.Position(
                        portfolio_id=transaction.portfolio_id,
                        asset_id=transaction.asset_id,
                        quantity=0,
                        average_price=0,
                        total_invested=0,
                        realized_pnl=0,
                        dividends_received=0
                    )
                    self.db.add(position)
                
                if transaction.transaction_type == models.TransactionType.BUY:
                    # Update average price
                    total_cost = position.quantity * position.average_price
                    new_total_cost = total_cost + transaction.total_amount
                    new_quantity = position.quantity + transaction.quantity
                    
                    position.quantity = new_quantity
                    position.average_price = new_total_cost / new_quantity if new_quantity > 0 else 0
                    position.total_invested += transaction.total_amount
                    
                elif transaction.transaction_type == models.TransactionType.SELL:
                    # Calculate realized P&L
                    sale_cost_basis = position.average_price * transaction.quantity
                    sale_proceeds = transaction.total_amount
                    realized_pnl = sale_proceeds - sale_cost_basis
                    
                    position.quantity -= transaction.quantity
                    position.realized_pnl += realized_pnl
                    position.total_invested -= sale_cost_basis
                
                self.update_position(position)
                
            elif transaction.transaction_type == models.TransactionType.DIVIDEND:
                # Update dividend received
                position = self.db.query(models.Position).filter(
                    models.Position.portfolio_id == transaction.portfolio_id,
                    models.Position.asset_id == transaction.asset_id
                ).first()
                
                if position:
                    position.dividends_received += transaction.total_amount
                    self.db.commit()
            
        except Exception as e:
            logger.error(f"Error processing transaction: {str(e)}")
            self.db.rollback()
