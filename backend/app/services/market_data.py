import yfinance as yf
from datetime import datetime, timedelta, date
from typing import Optional, Dict, List
import requests
from sqlalchemy.orm import Session
from .. import models
from ..config import settings
import logging
import warnings

# Suppress yfinance warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="yfinance")
warnings.filterwarnings("ignore", message=".*invalid value encountered.*")

logger = logging.getLogger(__name__)

class MarketDataService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_yahoo_ticker(self, symbol: str, exchange: str = None) -> str:
        """Convert symbol to Yahoo Finance format"""
        if exchange == "B3":
            return f"{symbol}.SA"
        return symbol
    
    def update_asset_price(self, asset: models.Asset) -> Optional[float]:
        """Update current price for an asset"""
        try:
            ticker_symbol = self.get_yahoo_ticker(asset.symbol, asset.exchange)
            ticker = yf.Ticker(ticker_symbol)
            
            # Get current price
            info = ticker.info
            current_price = info.get('regularMarketPrice') or info.get('previousClose')
            
            if current_price:
                # Save to database
                today = date.today()
                existing_price = self.db.query(models.Price).filter(
                    models.Price.asset_id == asset.id,
                    models.Price.date == today
                ).first()
                
                if existing_price:
                    existing_price.close = current_price
                    existing_price.adjusted_close = current_price
                else:
                    new_price = models.Price(
                        asset_id=asset.id,
                        date=today,
                        close=current_price,
                        adjusted_close=current_price
                    )
                    self.db.add(new_price)
                
                self.db.commit()
                return current_price
                
        except Exception as e:
            logger.error(f"Error updating price for {asset.symbol}: {str(e)}")
        
        return None
    
    def update_historical_prices(self, asset: models.Asset, period: str = "1mo"):
        """Update historical prices for an asset"""
        try:
            ticker_symbol = self.get_yahoo_ticker(asset.symbol, asset.exchange)
            ticker = yf.Ticker(ticker_symbol)
            
            # Get historical data
            hist = ticker.history(period=period)
            
            for date_idx, row in hist.iterrows():
                price_date = date_idx.date()
                
                existing_price = self.db.query(models.Price).filter(
                    models.Price.asset_id == asset.id,
                    models.Price.date == price_date
                ).first()
                
                if existing_price:
                    existing_price.open = row['Open']
                    existing_price.high = row['High']
                    existing_price.low = row['Low']
                    existing_price.close = row['Close']
                    existing_price.volume = row['Volume']
                else:
                    new_price = models.Price(
                        asset_id=asset.id,
                        date=price_date,
                        open=row['Open'],
                        high=row['High'],
                        low=row['Low'],
                        close=row['Close'],
                        volume=row['Volume']
                    )
                    self.db.add(new_price)
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating historical prices for {asset.symbol}: {str(e)}")
            return False
    
    def get_exchange_rate(self, from_currency: str, to_currency: str) -> Optional[float]:
        """Get current exchange rate"""
        if from_currency == to_currency:
            return 1.0
        
        try:
            # Try Yahoo Finance first
            ticker_symbol = f"{from_currency}{to_currency}=X"
            ticker = yf.Ticker(ticker_symbol)
            info = ticker.info
            rate = info.get('regularMarketPrice') or info.get('previousClose')
            
            if rate:
                # Save to database
                today = date.today()
                existing_rate = self.db.query(models.ExchangeRate).filter(
                    models.ExchangeRate.from_currency == from_currency,
                    models.ExchangeRate.to_currency == to_currency,
                    models.ExchangeRate.date == today
                ).first()
                
                if existing_rate:
                    existing_rate.rate = rate
                else:
                    new_rate = models.ExchangeRate(
                        from_currency=from_currency,
                        to_currency=to_currency,
                        date=today,
                        rate=rate
                    )
                    self.db.add(new_rate)
                
                self.db.commit()
                return rate
                
        except Exception as e:
            logger.error(f"Error getting exchange rate {from_currency}/{to_currency}: {str(e)}")
        
        return None
    
    def update_benchmark_data(self, benchmark: str, period: str = "1mo"):
        """Update benchmark index data"""
        benchmark_tickers = {
            "IBOV": "^BVSP",
            "SP500": "^GSPC",
            "NASDAQ": "^IXIC",
            "DOW": "^DJI",
            "IPCA": None,  # Need special handling
            "CDI": None,    # Need special handling from BCB
            "SELIC": None   # Need special handling from BCB
        }
        
        if benchmark not in benchmark_tickers:
            logger.warning(f"Unknown benchmark: {benchmark}")
            return False
        
        ticker_symbol = benchmark_tickers.get(benchmark)
        
        if ticker_symbol:
            try:
                ticker = yf.Ticker(ticker_symbol)
                hist = ticker.history(period=period)
                
                for date_idx, row in hist.iterrows():
                    bench_date = date_idx.date()
                    
                    existing = self.db.query(models.Benchmark).filter(
                        models.Benchmark.symbol == benchmark,
                        models.Benchmark.date == bench_date
                    ).first()
                    
                    if existing:
                        existing.value = row['Close']
                    else:
                        new_benchmark = models.Benchmark(
                            symbol=benchmark,
                            name=benchmark,
                            date=bench_date,
                            value=row['Close']
                        )
                        self.db.add(new_benchmark)
                
                self.db.commit()
                return True
                
            except Exception as e:
                logger.error(f"Error updating benchmark {benchmark}: {str(e)}")
                return False
        
        # Handle special cases (CDI, SELIC, IPCA)
        if benchmark in ["CDI", "SELIC"]:
            return self._update_brazilian_rates(benchmark)
        
        return False
    
    def _update_brazilian_rates(self, rate_type: str):
        """Update Brazilian interest rates from BCB"""
        # This would connect to Brazilian Central Bank API
        # For now, using placeholder values
        try:
            today = date.today()
            
            # Placeholder rates
            rates = {
                "CDI": 11.65,  # Annual rate in %
                "SELIC": 11.75  # Annual rate in %
            }
            
            if rate_type in rates:
                daily_rate = rates[rate_type] / 365  # Simple daily conversion
                
                existing = self.db.query(models.Benchmark).filter(
                    models.Benchmark.symbol == rate_type,
                    models.Benchmark.date == today
                ).first()
                
                if existing:
                    existing.value = rates[rate_type]
                    existing.daily_return = daily_rate
                else:
                    new_benchmark = models.Benchmark(
                        symbol=rate_type,
                        name=rate_type,
                        date=today,
                        value=rates[rate_type],
                        daily_return=daily_rate
                    )
                    self.db.add(new_benchmark)
                
                self.db.commit()
                return True
                
        except Exception as e:
            logger.error(f"Error updating Brazilian rate {rate_type}: {str(e)}")
        
        return False
    
    def search_asset(self, query: str) -> List[Dict]:
        """Search for assets by symbol or name using Yahoo Finance"""
        results = []
        
        # Use Yahoo Finance (Brapi requires API key now)
        yahoo_results = self._search_yahoo_finance(query)
        results.extend(yahoo_results)
        
        # Remove duplicates and limit results
        seen = set()
        unique_results = []
        for result in results:
            symbol = result.get('symbol')
            if symbol and symbol not in seen:
                seen.add(symbol)
                unique_results.append(result)
        
        return unique_results[:15]  # Limit to 15 results
    
    def _search_brapi(self, query: str) -> List[Dict]:
        """Search Brazilian stocks using Brapi API"""
        try:
            # Brapi API for Brazilian stocks - use quote endpoint directly
            # Try both the exact query and with common suffixes
            symbols_to_try = [
                query.upper(),
                f"{query.upper()}3",
                f"{query.upper()}4", 
                f"{query.upper()}11"
            ]
            
            matching_stocks = []
            
            for symbol in symbols_to_try:
                try:
                    url = f"https://brapi.dev/api/quote/{symbol}"
                    response = requests.get(url, timeout=3)
                    
                    if response.status_code == 200:
                        data = response.json()
                        results = data.get('results', [])
                        
                        if results:
                            stock = results[0]
                            stock_info = {
                                'symbol': stock.get('symbol'),
                                'name': stock.get('longName') or stock.get('shortName'),
                                'exchange': 'B3',
                                'sector': stock.get('sector'),
                                'asset_type': 'STOCK',
                                'currency': 'BRL',
                                'current_price': stock.get('regularMarketPrice'),
                                'market_cap': stock.get('marketCap'),
                                'industry': stock.get('industry')
                            }
                            
                            if stock_info['symbol'] and stock_info['name']:
                                matching_stocks.append(stock_info)
                        
                except Exception as e:
                    logger.debug(f"Error getting Brapi info for {symbol}: {str(e)}")
                    continue
            
            return matching_stocks[:5]  # Limit results
                
        except Exception as e:
            logger.error(f"Error searching Brapi for {query}: {str(e)}")
        
        return []
    
    def _search_yahoo_finance(self, query: str) -> List[Dict]:
        """Search using Yahoo Finance - only show results that match user input"""
        try:
            base_query = query.upper()
            results = []
            
            # Only search for symbols that make sense for the user input
            symbols_to_try = []
            
            # If user types 3+ chars, try exact matches and logical variations
            if len(base_query) >= 3:
                # 1. Exact match first
                symbols_to_try.append(base_query)
                
                # 2. For Brazilian stocks, try .SA suffix
                if not base_query.endswith('.SA'):
                    symbols_to_try.append(f"{base_query}.SA")
                
                # 3. Only add common BR variations for known patterns
                if len(base_query) == 4 and base_query.endswith(('4', '3')):
                    # Already has number (PETR4, VALE3) - try with .SA
                    symbols_to_try.append(f"{base_query}.SA")
                elif len(base_query) <= 4 and not base_query.endswith(('4', '3', '11')):
                    # Base ticker (PETR, VALE) - try common variations
                    symbols_to_try.extend([
                        f"{base_query}4.SA",  # Most common (PN)
                        f"{base_query}3.SA",  # Second most common (ON)
                    ])
            
            # Short queries (1-2 chars) - only exact matches
            elif len(base_query) >= 2:
                symbols_to_try.append(base_query)
            
            for symbol in symbols_to_try:
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    
                    # Check if we got valid data
                    if info and info.get('symbol') and info.get('longName'):
                        # Determine asset type
                        quote_type = info.get('quoteType', '').upper()
                        asset_type = {
                            'EQUITY': 'STOCK',
                            'ETF': 'ETF', 
                            'MUTUALFUND': 'FUND',
                            'INDEX': 'INDEX',
                            'CRYPTOCURRENCY': 'CRYPTO'
                        }.get(quote_type, 'STOCK')
                        
                        # Determine exchange
                        exchange = info.get('exchange', '')
                        if '.SA' in symbol or exchange in ['SAO', 'BOVESPA']:
                            exchange = 'B3'
                        elif exchange in ['NMS', 'NGM']:
                            exchange = 'NASDAQ'
                        elif exchange == 'NYQ':
                            exchange = 'NYSE'
                        elif exchange in ['LSE']:
                            exchange = 'LSE'
                        else:
                            exchange = exchange or 'OTHER'
                        
                        # Calculate relevance - prioritize exact matches
                        symbol_clean = info.get('symbol', '').replace('.SA', '')
                        relevance_score = 0
                        
                        # Perfect match (user typed exactly this)
                        if symbol_clean.upper() == base_query or info.get('symbol', '').upper() == base_query:
                            relevance_score = 100
                        # Starts with user input (PETR matches PETR4) 
                        elif symbol_clean.upper().startswith(base_query):
                            relevance_score = 80
                        # Contains user input
                        elif base_query in symbol_clean.upper():
                            relevance_score = 60
                        # Company name contains user input
                        elif base_query in info.get('longName', '').upper():
                            relevance_score = 40
                        else:
                            relevance_score = 10
                            
                        # Bonus for popular exchanges
                        if exchange in ['B3', 'NASDAQ', 'NYSE']:
                            relevance_score += 5
                            
                        # Filter out irrelevant results (score too low)
                        if relevance_score < 30:
                            continue
                            
                        result = {
                            'symbol': info.get('symbol'),
                            'name': info.get('longName') or info.get('shortName'),
                            'exchange': exchange,
                            'sector': info.get('sector'),
                            'asset_type': asset_type,
                            'currency': info.get('currency', 'USD'),
                            'current_price': info.get('regularMarketPrice') or info.get('previousClose'),
                            'market_cap': info.get('marketCap'),
                            'industry': info.get('industry'),
                            'relevance_score': relevance_score
                        }
                        
                        # Only add if we have essential info and it's not a duplicate
                        if result['symbol'] and result['name']:
                            # Avoid adding the same symbol twice
                            if not any(r['symbol'] == result['symbol'] for r in results):
                                results.append(result)
                            
                except Exception as e:
                    logger.debug(f"Error getting Yahoo Finance info for {symbol}: {str(e)}")
                    continue
            
            # Sort by relevance score (highest first)
            results.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
            
            # Remove relevance score from final results
            for result in results:
                result.pop('relevance_score', None)
            
            return results[:5]  # Limit to 5 most relevant results
            
        except Exception as e:
            logger.error(f"Error searching Yahoo Finance for {query}: {str(e)}")
        
        return []
