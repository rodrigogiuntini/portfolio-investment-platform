from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import date, datetime, timedelta
from .. import models, schemas

class AdvancedCalculator:
    """Advanced portfolio calculations including dividends and yield metrics"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_yield_metrics(self, position_id: int) -> schemas.YieldMetrics:
        """Calculate yield metrics for a position"""
        position = self.db.query(models.Position).filter(
            models.Position.id == position_id
        ).first()
        
        if not position:
            raise ValueError("Position not found")
        
        # Get all dividends for this position
        dividends = self.db.query(models.Dividend).filter(
            models.Dividend.position_id == position_id
        ).all()
        
        total_dividends = sum(d.net_amount or d.total_amount for d in dividends)
        
        # Calculate Yield on Cost (YOC)
        yield_on_cost = 0.0
        if position.total_invested > 0:
            # Annual dividend income based on last 12 months
            one_year_ago = datetime.now().date() - timedelta(days=365)
            recent_dividends = [d for d in dividends if d.payment_date >= one_year_ago]
            annual_dividend_income = sum(d.net_amount or d.total_amount for d in recent_dividends)
            yield_on_cost = (annual_dividend_income / position.total_invested) * 100
        
        # Calculate current yield
        current_yield = 0.0
        if position.current_value and position.current_value > 0:
            # Annual dividend income / current market value
            one_year_ago = datetime.now().date() - timedelta(days=365)
            recent_dividends = [d for d in dividends if d.payment_date >= one_year_ago]
            annual_dividend_income = sum(d.net_amount or d.total_amount for d in recent_dividends)
            current_yield = (annual_dividend_income / position.current_value) * 100
        
        # Project annual and monthly income
        annual_dividend_income = self._project_annual_income(position_id)
        monthly_dividend_income = annual_dividend_income / 12
        
        # Calculate dividend growth rate (simplified)
        dividend_growth_rate = self._calculate_dividend_growth_rate(position_id)
        
        return schemas.YieldMetrics(
            yield_on_cost=yield_on_cost,
            current_yield=current_yield,
            annual_dividend_income=annual_dividend_income,
            monthly_dividend_income=monthly_dividend_income,
            total_dividends_received=total_dividends,
            dividend_growth_rate=dividend_growth_rate
        )
    
    def calculate_capital_gain_metrics(self, position_id: int) -> schemas.CapitalGainMetrics:
        """Calculate capital gain metrics for a position"""
        position = self.db.query(models.Position).filter(
            models.Position.id == position_id
        ).first()
        
        if not position:
            raise ValueError("Position not found")
        
        current_value = position.current_value or 0
        total_invested = position.total_invested or 0
        capital_gain = current_value - total_invested
        capital_gain_percentage = (capital_gain / total_invested * 100) if total_invested > 0 else 0
        
        return schemas.CapitalGainMetrics(
            total_invested=total_invested,
            current_value=current_value,
            capital_gain=capital_gain,
            capital_gain_percentage=capital_gain_percentage,
            average_purchase_price=position.average_price or 0,
            current_price=position.current_price or 0
        )
    
    def calculate_total_return_metrics(self, position_id: int) -> schemas.TotalReturnMetrics:
        """Calculate total return including capital gains and dividends"""
        position = self.db.query(models.Position).filter(
            models.Position.id == position_id
        ).first()
        
        if not position:
            raise ValueError("Position not found")
        
        # Get capital gain
        capital_gain_metrics = self.calculate_capital_gain_metrics(position_id)
        capital_gain = capital_gain_metrics.capital_gain
        
        # Get dividend income
        dividends = self.db.query(models.Dividend).filter(
            models.Dividend.position_id == position_id
        ).all()
        dividend_income = sum(d.net_amount or d.total_amount for d in dividends)
        
        # Calculate total return
        total_return = capital_gain + dividend_income
        total_return_percentage = (total_return / position.total_invested * 100) if position.total_invested > 0 else 0
        
        # Calculate annualized return (simplified - needs holding period)
        annualized_return = self._calculate_annualized_return(position_id, total_return_percentage)
        
        return schemas.TotalReturnMetrics(
            total_return=total_return,
            total_return_percentage=total_return_percentage,
            capital_gain=capital_gain,
            dividend_income=dividend_income,
            annualized_return=annualized_return
        )
    
    def calculate_portfolio_advanced_metrics(self, portfolio_id: int) -> schemas.AdvancedPortfolioMetrics:
        """Calculate advanced metrics for entire portfolio"""
        
        # Get all positions in portfolio
        positions = self.db.query(models.Position).filter(
            models.Position.portfolio_id == portfolio_id
        ).all()
        
        if not positions:
            # Return empty metrics if no positions
            return schemas.AdvancedPortfolioMetrics(
                yield_metrics=schemas.YieldMetrics(
                    yield_on_cost=0.0,
                    current_yield=0.0,
                    annual_dividend_income=0.0,
                    monthly_dividend_income=0.0,
                    total_dividends_received=0.0
                ),
                capital_gain_metrics=schemas.CapitalGainMetrics(
                    total_invested=0.0,
                    current_value=0.0,
                    capital_gain=0.0,
                    capital_gain_percentage=0.0,
                    average_purchase_price=0.0,
                    current_price=0.0
                ),
                total_return_metrics=schemas.TotalReturnMetrics(
                    total_return=0.0,
                    total_return_percentage=0.0,
                    capital_gain=0.0,
                    dividend_income=0.0
                )
            )
        
        # Aggregate metrics
        total_invested = sum(p.total_invested or 0 for p in positions)
        total_current_value = sum(p.current_value or 0 for p in positions)
        total_capital_gain = total_current_value - total_invested
        
        # Get all dividends for portfolio
        all_dividends = self.db.query(models.Dividend).filter(
            models.Dividend.portfolio_id == portfolio_id
        ).all()
        total_dividend_income = sum(d.net_amount or d.total_amount for d in all_dividends)
        
        # Calculate portfolio yield metrics
        annual_dividend_income = self._project_annual_income_portfolio(portfolio_id)
        yield_on_cost = (annual_dividend_income / total_invested * 100) if total_invested > 0 else 0
        current_yield = (annual_dividend_income / total_current_value * 100) if total_current_value > 0 else 0
        
        # Portfolio total return
        total_return = total_capital_gain + total_dividend_income
        total_return_percentage = (total_return / total_invested * 100) if total_invested > 0 else 0
        
        # Get cashflow projections
        cashflow_projections = self._get_portfolio_cashflow_projections(portfolio_id, 12)
        
        # Per-asset metrics
        asset_metrics = {}
        for position in positions:
            asset = self.db.query(models.Asset).filter(models.Asset.id == position.asset_id).first()
            if asset:
                try:
                    yield_metrics = self.calculate_yield_metrics(position.id)
                    capital_metrics = self.calculate_capital_gain_metrics(position.id)
                    total_metrics = self.calculate_total_return_metrics(position.id)
                    
                    asset_metrics[asset.symbol] = {
                        "yield_metrics": yield_metrics.model_dump(),
                        "capital_gain_metrics": capital_metrics.model_dump(),
                        "total_return_metrics": total_metrics.model_dump()
                    }
                except Exception:
                    # Skip assets with calculation errors
                    continue
        
        return schemas.AdvancedPortfolioMetrics(
            yield_metrics=schemas.YieldMetrics(
                yield_on_cost=yield_on_cost,
                current_yield=current_yield,
                annual_dividend_income=annual_dividend_income,
                monthly_dividend_income=annual_dividend_income / 12,
                total_dividends_received=total_dividend_income
            ),
            capital_gain_metrics=schemas.CapitalGainMetrics(
                total_invested=total_invested,
                current_value=total_current_value,
                capital_gain=total_capital_gain,
                capital_gain_percentage=(total_capital_gain / total_invested * 100) if total_invested > 0 else 0,
                average_purchase_price=0.0,  # Not applicable for portfolio
                current_price=0.0  # Not applicable for portfolio
            ),
            total_return_metrics=schemas.TotalReturnMetrics(
                total_return=total_return,
                total_return_percentage=total_return_percentage,
                capital_gain=total_capital_gain,
                dividend_income=total_dividend_income
            ),
            cashflow_projections=cashflow_projections,
            asset_metrics=asset_metrics
        )
    
    def _project_annual_income(self, position_id: int) -> float:
        """Project annual dividend income based on recurring dividends"""
        recurring_dividends = self.db.query(models.Dividend).filter(
            models.Dividend.position_id == position_id,
            models.Dividend.is_recurring == True
        ).all()
        
        annual_income = 0.0
        
        for dividend in recurring_dividends:
            amount = dividend.net_amount or dividend.total_amount
            
            if dividend.frequency == models.PaymentFrequency.MONTHLY:
                annual_income += amount * 12
            elif dividend.frequency == models.PaymentFrequency.QUARTERLY:
                annual_income += amount * 4
            elif dividend.frequency == models.PaymentFrequency.SEMIANNUAL:
                annual_income += amount * 2
            elif dividend.frequency == models.PaymentFrequency.ANNUAL:
                annual_income += amount
            # EVENTUAL dividends are not projected
        
        return annual_income
    
    def _project_annual_income_portfolio(self, portfolio_id: int) -> float:
        """Project annual dividend income for entire portfolio"""
        positions = self.db.query(models.Position).filter(
            models.Position.portfolio_id == portfolio_id
        ).all()
        
        total_annual_income = 0.0
        for position in positions:
            total_annual_income += self._project_annual_income(position.id)
        
        return total_annual_income
    
    def _calculate_dividend_growth_rate(self, position_id: int) -> Optional[float]:
        """Calculate dividend growth rate (simplified)"""
        # This is a simplified implementation
        # In practice, you'd want to compare year-over-year dividend payments
        dividends = self.db.query(models.Dividend).filter(
            models.Dividend.position_id == position_id
        ).order_by(models.Dividend.payment_date).all()
        
        if len(dividends) < 2:
            return None
        
        # Simple comparison of latest vs earliest (needs more sophisticated logic)
        latest = dividends[-1]
        earliest = dividends[0]
        
        if earliest.amount_per_share > 0:
            growth = ((latest.amount_per_share - earliest.amount_per_share) / earliest.amount_per_share) * 100
            return growth
        
        return None
    
    def _calculate_annualized_return(self, position_id: int, total_return_percentage: float) -> Optional[float]:
        """Calculate annualized return (simplified)"""
        # Get first transaction to estimate holding period
        position = self.db.query(models.Position).filter(
            models.Position.id == position_id
        ).first()
        
        if not position:
            return None
        
        # Get earliest transaction for this position
        earliest_transaction = self.db.query(models.Transaction).filter(
            models.Transaction.portfolio_id == position.portfolio_id,
            models.Transaction.asset_id == position.asset_id
        ).order_by(models.Transaction.date).first()
        
        if not earliest_transaction:
            return None
        
        # Calculate holding period in years
        holding_period = (datetime.now().date() - earliest_transaction.date).days / 365.25
        
        if holding_period > 0:
            # Annualized return = (1 + total_return)^(1/years) - 1
            annualized = ((1 + total_return_percentage / 100) ** (1 / holding_period) - 1) * 100
            return annualized
        
        return None
    
    def _get_portfolio_cashflow_projections(self, portfolio_id: int, months_ahead: int) -> List[schemas.CashflowProjection]:
        """Get cashflow projections for portfolio"""
        # This would be similar to the dividends router method
        # Simplified implementation
        recurring_dividends = self.db.query(models.Dividend).filter(
            models.Dividend.portfolio_id == portfolio_id,
            models.Dividend.is_recurring == True
        ).all()
        
        projections = []
        current_date = datetime.now().date()
        end_date = current_date + timedelta(days=months_ahead * 30)
        
        for dividend in recurring_dividends:
            asset = self.db.query(models.Asset).filter(models.Asset.id == dividend.asset_id).first()
            if not asset:
                continue
                
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
                
                # Calculate next payment date (simplified)
                if dividend.frequency == models.PaymentFrequency.MONTHLY:
                    if projection_date.month == 12:
                        projection_date = projection_date.replace(year=projection_date.year + 1, month=1)
                    else:
                        projection_date = projection_date.replace(month=projection_date.month + 1)
                elif dividend.frequency == models.PaymentFrequency.QUARTERLY:
                    month = projection_date.month + 3
                    year = projection_date.year + (month - 1) // 12
                    month = ((month - 1) % 12) + 1
                    projection_date = projection_date.replace(year=year, month=month)
                elif dividend.frequency == models.PaymentFrequency.ANNUAL:
                    projection_date = projection_date.replace(year=projection_date.year + 1)
                else:
                    break
        
        return sorted(projections, key=lambda x: x.date)
