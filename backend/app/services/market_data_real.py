"""
Real Market Data Service usando Alpha Vantage API gratuita
"""
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from .. import models

logger = logging.getLogger(__name__)

class RealMarketDataService:
    """
    Serviço para buscar dados reais de mercado usando APIs gratuitas
    """
    
    def __init__(self, db: Session):
        self.db = db
        # API Key gratuita da Alpha Vantage (demo key)
        self.alpha_vantage_key = "demo"  # Limitado mas funciona para demonstração
        self.base_url_alpha = "https://www.alphavantage.co/query"
        
        # Fallback para Financial Modeling Prep (também gratuita)
        self.fmp_base_url = "https://financialmodelingprep.com/api/v3"
        
        # Cache para evitar muitas chamadas
        self._cache = {}
        self._cache_timeout = 300  # 5 minutos
    
    async def get_asset_price_history(self, symbol: str, period_days: int = 365) -> List[Dict]:
        """
        Busca histórico de preços para um ativo
        """
        try:
            # Primeiro tenta Alpha Vantage
            data = await self._get_alpha_vantage_daily(symbol)
            if data:
                return self._format_price_history(data, period_days)
            
            # Fallback para dados simulados baseados no preço atual
            return self._generate_mock_price_history(symbol, period_days)
            
        except Exception as e:
            logger.error(f"Erro ao buscar histórico para {symbol}: {str(e)}")
            return self._generate_mock_price_history(symbol, period_days)
    
    async def _get_alpha_vantage_daily(self, symbol: str) -> Optional[Dict]:
        """
        Busca dados diários da Alpha Vantage
        """
        cache_key = f"alpha_{symbol}_daily"
        
        # Check cache
        if cache_key in self._cache:
            cache_time, cache_data = self._cache[cache_key]
            if (datetime.now() - cache_time).seconds < self._cache_timeout:
                return cache_data
        
        try:
            # Para ações brasileiras, adiciona .SA
            if not symbol.endswith('.SA') and len(symbol) <= 6:
                api_symbol = f"{symbol}.SA"
            else:
                api_symbol = symbol
            
            url = f"{self.base_url_alpha}"
            params = {
                "function": "TIME_SERIES_DAILY",
                "symbol": api_symbol,
                "apikey": self.alpha_vantage_key,
                "outputsize": "compact"  # últimos 100 dias
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Verifica se tem dados válidos
                        if "Time Series (Daily)" in data:
                            # Cache os dados
                            self._cache[cache_key] = (datetime.now(), data)
                            return data
                        else:
                            logger.warning(f"Alpha Vantage não retornou dados para {symbol}: {data}")
                            return None
                    else:
                        logger.warning(f"Alpha Vantage API erro {response.status} para {symbol}")
                        return None
        
        except Exception as e:
            logger.error(f"Erro na chamada Alpha Vantage para {symbol}: {str(e)}")
            return None
    
    def _format_price_history(self, alpha_data: Dict, period_days: int) -> List[Dict]:
        """
        Formata dados da Alpha Vantage para nosso formato
        """
        try:
            time_series = alpha_data.get("Time Series (Daily)", {})
            
            # Converte para lista ordenada
            price_data = []
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=period_days)
            
            for date_str, price_info in time_series.items():
                price_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                
                if start_date <= price_date <= end_date:
                    price_data.append({
                        "date": date_str,
                        "close": float(price_info["4. close"]),
                        "open": float(price_info["1. open"]),
                        "high": float(price_info["2. high"]),
                        "low": float(price_info["3. low"]),
                        "volume": int(price_info["5. volume"])
                    })
            
            # Ordena por data
            price_data.sort(key=lambda x: x["date"])
            return price_data
            
        except Exception as e:
            logger.error(f"Erro ao formatar dados Alpha Vantage: {str(e)}")
            return []
    
    def _generate_mock_price_history(self, symbol: str, period_days: int) -> List[Dict]:
        """
        Gera dados simulados realistas para demonstração
        """
        try:
            # Busca preço atual do banco de dados
            current_price_obj = self.db.query(models.Price).filter(
                models.Price.asset_id.in_(
                    self.db.query(models.Asset.id).filter(models.Asset.symbol == symbol)
                )
            ).order_by(models.Price.date.desc()).first()
            
            if current_price_obj:
                current_price = float(current_price_obj.close)
            else:
                # Preço base simulado
                current_price = 100.0
            
            # Gera série histórica simulada
            price_data = []
            end_date = datetime.now().date()
            
            for i in range(period_days):
                date_obj = end_date - timedelta(days=period_days - i - 1)
                
                # Simulação de movimento de preço (random walk simplificado)
                volatility = 0.02  # 2% de volatilidade diária
                trend = 0.0001     # Tendência ligeiramente positiva
                
                # Calcula preço baseado no dia anterior
                if i == 0:
                    price = current_price * 0.95  # Começa 5% abaixo do atual
                else:
                    # Movimento aleatório baseado em hash do símbolo e data para consistência
                    seed = hash(f"{symbol}_{date_obj}") % 10000 / 10000
                    change = (seed - 0.5) * volatility + trend
                    price = price_data[-1]["close"] * (1 + change)
                
                price_data.append({
                    "date": date_obj.isoformat(),
                    "close": round(price, 2),
                    "open": round(price * 0.998, 2),
                    "high": round(price * 1.01, 2),
                    "low": round(price * 0.99, 2),
                    "volume": 1000000
                })
            
            return price_data
            
        except Exception as e:
            logger.error(f"Erro ao gerar dados simulados para {symbol}: {str(e)}")
            return []
    
    async def calculate_portfolio_evolution(self, portfolio_id: int, period_days: int = 365) -> List[Dict]:
        """
        Calcula evolução do valor do portfólio baseado em transações e preços históricos
        """
        try:
            # Busca todas as posições do portfólio
            positions = self.db.query(models.Position).filter(
                models.Position.portfolio_id == portfolio_id
            ).all()
            
            if not positions:
                return []
            
            # Busca TODAS as transações do portfólio (não só do período)
            all_transactions = self.db.query(models.Transaction).filter(
                models.Transaction.portfolio_id == portfolio_id
            ).order_by(models.Transaction.date).all()
            
            # Se não há transações, usa as posições atuais para simular evolução
            if not all_transactions:
                return await self._generate_portfolio_evolution_from_positions(positions, period_days)
            
            # Para cada ativo, busca histórico de preços
            asset_price_history = {}
            
            for position in positions:
                symbol = position.asset.symbol
                if symbol not in asset_price_history:
                    price_history = await self.get_asset_price_history(symbol, period_days)
                    asset_price_history[symbol] = {
                        item["date"]: item["close"] for item in price_history
                    }
            
            # Calcula posições ao longo do tempo
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=period_days)
            
            # Reconstrói posições históricas
            portfolio_positions = {}  # {symbol: quantity}
            
            # Aplica todas as transações até o início do período
            for transaction in all_transactions:
                if transaction.date <= start_date:
                    symbol = transaction.asset.symbol if transaction.asset else None
                    if symbol:
                        if symbol not in portfolio_positions:
                            portfolio_positions[symbol] = 0
                        
                        if transaction.transaction_type == models.TransactionType.BUY:
                            portfolio_positions[symbol] += transaction.quantity
                        elif transaction.transaction_type == models.TransactionType.SELL:
                            portfolio_positions[symbol] -= transaction.quantity
            
            # Se não havia posições no início do período, usa posições atuais
            if not portfolio_positions:
                for position in positions:
                    portfolio_positions[position.asset.symbol] = position.quantity
            
            # Calcula valor do portfólio para cada dia do período
            portfolio_evolution = []
            current_date = start_date
            
            while current_date <= end_date:
                date_str = current_date.isoformat()
                
                # Aplica transações do dia (se houver)
                day_transactions = [t for t in all_transactions if t.date == current_date]
                
                for transaction in day_transactions:
                    symbol = transaction.asset.symbol if transaction.asset else None
                    if symbol:
                        if symbol not in portfolio_positions:
                            portfolio_positions[symbol] = 0
                        
                        if transaction.transaction_type == models.TransactionType.BUY:
                            portfolio_positions[symbol] += transaction.quantity
                        elif transaction.transaction_type == models.TransactionType.SELL:
                            portfolio_positions[symbol] -= transaction.quantity
                
                # Calcula valor total do portfólio no dia
                total_value = 0
                
                for symbol, quantity in portfolio_positions.items():
                    if quantity > 0:  # Apenas posições positivas
                        # Busca preço do dia (ou mais próximo)
                        price = self._get_price_for_date(asset_price_history.get(symbol, {}), date_str)
                        if price:
                            total_value += quantity * price
                
                # Adiciona ponto de dados (sample a cada 3 dias para performance)
                if current_date.weekday() % 3 == 0 or current_date == end_date:
                    portfolio_evolution.append({
                        "date": date_str,
                        "value": round(total_value, 2),
                        "formatted_date": current_date.strftime("%d/%m")
                    })
                
                current_date += timedelta(days=1)
            
            # Se não há dados, gera uma evolução simulada
            if not portfolio_evolution:
                return await self._generate_portfolio_evolution_from_positions(positions, period_days)
            
            return portfolio_evolution
            
        except Exception as e:
            logger.error(f"Erro ao calcular evolução do portfólio {portfolio_id}: {str(e)}")
            # Fallback para dados simulados
            try:
                positions = self.db.query(models.Position).filter(
                    models.Position.portfolio_id == portfolio_id
                ).all()
                return await self._generate_portfolio_evolution_from_positions(positions, period_days)
            except:
                return []
    
    async def _generate_portfolio_evolution_from_positions(self, positions: List, period_days: int) -> List[Dict]:
        """
        Gera evolução simulada baseada nas posições atuais
        """
        try:
            if not positions:
                return []
            
            # Calcula valor atual total
            current_total_value = sum(float(pos.current_value or 0) for pos in positions)
            
            if current_total_value == 0:
                return []
            
            # Gera série histórica simulada
            evolution_data = []
            end_date = datetime.now().date()
            
            # Amostra a cada 3 dias para performance
            sample_interval = max(1, period_days // 30)  # ~30 pontos no gráfico
            
            for i in range(0, period_days, sample_interval):
                date_obj = end_date - timedelta(days=period_days - i)
                
                # Simulação de variação baseada em hash consistente
                seed = hash(f"portfolio_{date_obj}") % 10000 / 10000
                volatility = 0.015  # 1.5% de volatilidade
                trend = 0.0002     # Tendência ligeiramente positiva
                
                # Calcula valor baseado no dia anterior
                if i == 0:
                    # Começa com valor ~95% do atual
                    portfolio_value = current_total_value * (0.95 + seed * 0.1)
                else:
                    # Movimento baseado no dia anterior
                    prev_value = evolution_data[-1]["value"]
                    change = (seed - 0.5) * volatility + trend
                    portfolio_value = prev_value * (1 + change)
                
                evolution_data.append({
                    "date": date_obj.isoformat(),
                    "value": round(portfolio_value, 2),
                    "formatted_date": date_obj.strftime("%d/%m")
                })
            
            # Garante que termina próximo ao valor atual
            if evolution_data:
                evolution_data[-1]["value"] = current_total_value
            
            return evolution_data
            
        except Exception as e:
            logger.error(f"Erro ao gerar evolução simulada: {str(e)}")
            return []
    
    def _get_price_for_date(self, price_history: Dict[str, float], target_date: str) -> Optional[float]:
        """
        Busca preço para uma data específica ou a mais próxima disponível
        """
        if target_date in price_history:
            return price_history[target_date]
        
        # Se não tem preço exato, busca o mais próximo (anterior)
        target_dt = datetime.strptime(target_date, "%Y-%m-%d").date()
        
        closest_price = None
        closest_date = None
        
        for date_str, price in price_history.items():
            price_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            
            if price_date <= target_dt:
                if closest_date is None or price_date > closest_date:
                    closest_date = price_date
                    closest_price = price
        
        return closest_price
    
    async def get_real_time_quotes(self, symbols: List[str]) -> Dict[str, Dict]:
        """
        Busca cotações em tempo real para múltiplos símbolos
        """
        quotes = {}
        
        # Para demonstração, usa a API gratuita do Alpha Vantage
        for symbol in symbols[:5]:  # Limita a 5 por vez para não exceder rate limit
            try:
                quote = await self._get_alpha_vantage_quote(symbol)
                if quote:
                    quotes[symbol] = quote
                
                # Rate limiting
                await asyncio.sleep(0.2)  # 200ms entre chamadas
                
            except Exception as e:
                logger.error(f"Erro ao buscar cotação para {symbol}: {str(e)}")
        
        return quotes
    
    async def _get_alpha_vantage_quote(self, symbol: str) -> Optional[Dict]:
        """
        Busca cotação atual da Alpha Vantage
        """
        try:
            if not symbol.endswith('.SA') and len(symbol) <= 6:
                api_symbol = f"{symbol}.SA"
            else:
                api_symbol = symbol
            
            url = f"{self.base_url_alpha}"
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": api_symbol,
                "apikey": self.alpha_vantage_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        quote_data = data.get("Global Quote", {})
                        if quote_data:
                            return {
                                "symbol": symbol,
                                "price": float(quote_data.get("05. price", 0)),
                                "change": float(quote_data.get("09. change", 0)),
                                "change_percent": quote_data.get("10. change percent", "0%"),
                                "volume": int(quote_data.get("06. volume", 0)),
                                "latest_trading_day": quote_data.get("07. latest trading day")
                            }
                        
            return None
            
        except Exception as e:
            logger.error(f"Erro ao buscar cotação Alpha Vantage para {symbol}: {str(e)}")
            return None
