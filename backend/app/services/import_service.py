import pandas as pd
import base64
import io
from datetime import datetime
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from .. import models
import logging

logger = logging.getLogger(__name__)

class ImportService:
    def __init__(self, db: Session):
        self.db = db
        
    def import_csv(self, portfolio_id: int, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Import transactions from CSV file"""
        errors = []
        imported_count = 0
        
        try:
            # Decode base64 content
            decoded = base64.b64decode(file_content)
            df = pd.read_csv(io.StringIO(decoded.decode('utf-8')))
            
            # Expected columns: date, symbol, type, quantity, price, total, fees, taxes
            required_columns = ['date', 'symbol', 'type', 'quantity', 'price', 'total']
            
            # Check for required columns
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return False, f"Missing columns: {', '.join(missing_columns)}", 0, errors
            
            for index, row in df.iterrows():
                try:
                    # Parse transaction data
                    transaction_date = pd.to_datetime(row['date']).date()
                    symbol = str(row['symbol']).upper()
                    transaction_type = self._parse_transaction_type(row['type'])
                    quantity = float(row.get('quantity', 0))
                    price = float(row.get('price', 0))
                    total = float(row['total'])
                    fees = float(row.get('fees', 0))
                    taxes = float(row.get('taxes', 0))
                    
                    # Find or create asset
                    asset = self.db.query(models.Asset).filter(
                        models.Asset.symbol == symbol
                    ).first()
                    
                    if not asset:
                        # Create new asset with minimal info
                        asset = models.Asset(
                            symbol=symbol,
                            name=symbol,  # Use symbol as name initially
                            asset_type=models.AssetType.STOCK,  # Default to stock
                            currency=models.Currency.BRL  # Default currency
                        )
                        self.db.add(asset)
                        self.db.flush()
                    
                    # Create transaction
                    transaction = models.Transaction(
                        portfolio_id=portfolio_id,
                        asset_id=asset.id if transaction_type != models.TransactionType.DEPOSIT else None,
                        transaction_type=transaction_type,
                        date=transaction_date,
                        quantity=quantity,
                        price=price,
                        total_amount=total,
                        fees=fees,
                        taxes=taxes
                    )
                    
                    self.db.add(transaction)
                    imported_count += 1
                    
                except Exception as e:
                    errors.append(f"Row {index + 1}: {str(e)}")
            
            self.db.commit()
            return True, f"Successfully imported {imported_count} transactions", imported_count, errors
            
        except Exception as e:
            self.db.rollback()
            return False, f"Import failed: {str(e)}", 0, errors
    
    def import_excel(self, portfolio_id: int, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Import transactions from Excel file"""
        errors = []
        imported_count = 0
        
        try:
            # Decode base64 content
            decoded = base64.b64decode(file_content)
            df = pd.read_excel(io.BytesIO(decoded))
            
            # Use same logic as CSV import
            return self._import_dataframe(portfolio_id, df)
            
        except Exception as e:
            return False, f"Excel import failed: {str(e)}", 0, errors
    
    def import_broker_extract(self, portfolio_id: int, broker: str, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Import broker-specific extracts"""
        broker_parsers = {
            'xp': self._parse_xp_extract,
            'clear': self._parse_clear_extract,
            'btg': self._parse_btg_extract,
            'nuinvest': self._parse_nuinvest_extract,
            'rico': self._parse_rico_extract,
            'inter': self._parse_inter_extract
        }
        
        if broker.lower() not in broker_parsers:
            return False, f"Unsupported broker: {broker}", 0, []
        
        parser = broker_parsers[broker.lower()]
        return parser(portfolio_id, file_content)
    
    def _import_dataframe(self, portfolio_id: int, df: pd.DataFrame) -> Tuple[bool, str, int, List[str]]:
        """Import transactions from a pandas DataFrame"""
        errors = []
        imported_count = 0
        
        try:
            # Normalize column names
            df.columns = df.columns.str.lower().str.strip()
            
            # Map common column variations
            column_mapping = {
                'data': 'date',
                'dt': 'date',
                'ativo': 'symbol',
                'ticker': 'symbol',
                'codigo': 'symbol',
                'operacao': 'type',
                'tipo': 'type',
                'qtd': 'quantity',
                'quantidade': 'quantity',
                'preco': 'price',
                'valor': 'price',
                'total': 'total',
                'valor_total': 'total',
                'taxas': 'fees',
                'corretagem': 'fees',
                'impostos': 'taxes'
            }
            
            df.rename(columns=column_mapping, inplace=True)
            
            # Process each row
            for index, row in df.iterrows():
                try:
                    # Skip empty rows
                    if pd.isna(row.get('symbol')) or pd.isna(row.get('date')):
                        continue
                    
                    # Parse transaction data
                    transaction_date = pd.to_datetime(row['date']).date()
                    symbol = str(row['symbol']).upper().strip()
                    
                    # Determine transaction type
                    type_str = str(row.get('type', '')).upper()
                    transaction_type = self._parse_transaction_type(type_str)
                    
                    quantity = float(row.get('quantity', 0))
                    price = float(row.get('price', 0))
                    total = float(row.get('total', quantity * price))
                    fees = float(row.get('fees', 0))
                    taxes = float(row.get('taxes', 0))
                    
                    # Find or create asset
                    asset = None
                    if transaction_type not in [models.TransactionType.DEPOSIT, models.TransactionType.WITHDRAW]:
                        asset = self.db.query(models.Asset).filter(
                            models.Asset.symbol == symbol
                        ).first()
                        
                        if not asset:
                            # Determine asset type from symbol
                            asset_type = self._determine_asset_type(symbol)
                            
                            asset = models.Asset(
                                symbol=symbol,
                                name=symbol,
                                asset_type=asset_type,
                                currency=models.Currency.BRL,
                                exchange="B3" if asset_type == models.AssetType.STOCK else None
                            )
                            self.db.add(asset)
                            self.db.flush()
                    
                    # Create transaction
                    transaction = models.Transaction(
                        portfolio_id=portfolio_id,
                        asset_id=asset.id if asset else None,
                        transaction_type=transaction_type,
                        date=transaction_date,
                        quantity=quantity,
                        price=price,
                        total_amount=total,
                        fees=fees,
                        taxes=taxes
                    )
                    
                    self.db.add(transaction)
                    imported_count += 1
                    
                except Exception as e:
                    errors.append(f"Row {index + 1}: {str(e)}")
            
            self.db.commit()
            
            if imported_count > 0:
                # Update positions after import
                from .portfolio_calc import PortfolioCalculator
                calc = PortfolioCalculator(self.db)
                
                transactions = self.db.query(models.Transaction).filter(
                    models.Transaction.portfolio_id == portfolio_id
                ).all()
                
                for transaction in transactions:
                    calc.process_transaction(transaction)
            
            return True, f"Successfully imported {imported_count} transactions", imported_count, errors
            
        except Exception as e:
            self.db.rollback()
            return False, f"Import failed: {str(e)}", 0, errors
    
    def _parse_transaction_type(self, type_str: str) -> models.TransactionType:
        """Parse transaction type from string"""
        type_str = type_str.upper().strip()
        
        type_mapping = {
            'COMPRA': models.TransactionType.BUY,
            'BUY': models.TransactionType.BUY,
            'C': models.TransactionType.BUY,
            'VENDA': models.TransactionType.SELL,
            'SELL': models.TransactionType.SELL,
            'V': models.TransactionType.SELL,
            'DIVIDENDO': models.TransactionType.DIVIDEND,
            'DIVIDEND': models.TransactionType.DIVIDEND,
            'DIV': models.TransactionType.DIVIDEND,
            'JCP': models.TransactionType.DIVIDEND,
            'JSCP': models.TransactionType.DIVIDEND,
            'JUROS': models.TransactionType.INTEREST,
            'INTEREST': models.TransactionType.INTEREST,
            'DEPOSITO': models.TransactionType.DEPOSIT,
            'DEPOSIT': models.TransactionType.DEPOSIT,
            'SAQUE': models.TransactionType.WITHDRAW,
            'WITHDRAW': models.TransactionType.WITHDRAW,
            'RETIRADA': models.TransactionType.WITHDRAW,
            'TAXA': models.TransactionType.FEE,
            'FEE': models.TransactionType.FEE,
            'IMPOSTO': models.TransactionType.TAX,
            'TAX': models.TransactionType.TAX,
            'IR': models.TransactionType.TAX
        }
        
        return type_mapping.get(type_str, models.TransactionType.BUY)
    
    def _determine_asset_type(self, symbol: str) -> models.AssetType:
        """Determine asset type from symbol pattern"""
        symbol = symbol.upper()
        
        # Brazilian patterns
        if symbol.endswith('11'):  # FIIs
            return models.AssetType.FUND
        elif symbol.endswith(('3', '4', '5', '6', '7', '8')):  # Stocks
            return models.AssetType.STOCK
        elif symbol.startswith('TESOURO'):
            return models.AssetType.BOND
        elif symbol in ['BTC', 'ETH', 'USDT', 'BNB']:
            return models.AssetType.CRYPTO
        else:
            return models.AssetType.OTHER
    
    def _parse_xp_extract(self, portfolio_id: int, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Parse XP Investimentos extract"""
        # Implementation specific to XP format
        # This would need to be customized based on actual XP extract format
        try:
            decoded = base64.b64decode(file_content)
            df = pd.read_excel(io.BytesIO(decoded))
            return self._import_dataframe(portfolio_id, df)
        except Exception as e:
            return False, f"XP extract parsing failed: {str(e)}", 0, []
    
    def _parse_clear_extract(self, portfolio_id: int, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Parse Clear Corretora extract"""
        # Implementation specific to Clear format
        try:
            decoded = base64.b64decode(file_content)
            df = pd.read_csv(io.StringIO(decoded.decode('utf-8')), sep=';')
            return self._import_dataframe(portfolio_id, df)
        except Exception as e:
            return False, f"Clear extract parsing failed: {str(e)}", 0, []
    
    def _parse_btg_extract(self, portfolio_id: int, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Parse BTG Pactual extract"""
        # Implementation specific to BTG format
        try:
            decoded = base64.b64decode(file_content)
            df = pd.read_excel(io.BytesIO(decoded))
            return self._import_dataframe(portfolio_id, df)
        except Exception as e:
            return False, f"BTG extract parsing failed: {str(e)}", 0, []
    
    def _parse_nuinvest_extract(self, portfolio_id: int, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Parse NuInvest extract"""
        # Implementation specific to NuInvest format
        try:
            decoded = base64.b64decode(file_content)
            df = pd.read_csv(io.StringIO(decoded.decode('utf-8')))
            return self._import_dataframe(portfolio_id, df)
        except Exception as e:
            return False, f"NuInvest extract parsing failed: {str(e)}", 0, []
    
    def _parse_rico_extract(self, portfolio_id: int, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Parse Rico extract"""
        # Implementation specific to Rico format
        try:
            decoded = base64.b64decode(file_content)
            df = pd.read_excel(io.BytesIO(decoded))
            return self._import_dataframe(portfolio_id, df)
        except Exception as e:
            return False, f"Rico extract parsing failed: {str(e)}", 0, []
    
    def _parse_inter_extract(self, portfolio_id: int, file_content: str) -> Tuple[bool, str, int, List[str]]:
        """Parse Banco Inter extract"""
        # Implementation specific to Inter format
        try:
            decoded = base64.b64decode(file_content)
            df = pd.read_csv(io.StringIO(decoded.decode('utf-8')))
            return self._import_dataframe(portfolio_id, df)
        except Exception as e:
            return False, f"Inter extract parsing failed: {str(e)}", 0, []
