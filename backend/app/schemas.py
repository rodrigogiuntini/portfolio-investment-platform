from pydantic import BaseModel, Field, ConfigDict
# Temporarily removed EmailStr to avoid email-validator dependency issues
# from pydantic import EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# Enums (matching database lowercase values)
class AssetTypeEnum(str, Enum):
    STOCK = "STOCK"
    BOND = "BOND"
    FUND = "FUND"
    ETF = "ETF"
    CRYPTO = "CRYPTO"
    REAL_ESTATE = "REAL_ESTATE"
    COMMODITY = "COMMODITY"
    CASH = "CASH"
    OTHER = "OTHER"

class TransactionTypeEnum(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    INTEREST = "INTEREST"
    DEPOSIT = "DEPOSIT"
    WITHDRAW = "WITHDRAW"
    FEE = "FEE"
    TAX = "TAX"
    SPLIT = "SPLIT"
    BONUS = "BONUS"

class CurrencyEnum(str, Enum):
    BRL = "BRL"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"

class ThemeModeEnum(str, Enum):
    LIGHT = "LIGHT"
    DARK = "DARK"
    AUTO = "AUTO"

class LanguageEnum(str, Enum):
    PT_BR = "PT_BR"
    EN_US = "EN_US"
    ES_ES = "ES_ES"

class ChartTypeEnum(str, Enum):
    LINE = "LINE"
    CANDLESTICK = "CANDLESTICK"
    AREA = "AREA"

# User Schemas
class UserBase(BaseModel):
    email: str  # Temporarily using str instead of EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None  # Temporarily using str instead of EmailStr
    username: Optional[str] = None
    password: Optional[str] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Portfolio Schemas
class PortfolioBase(BaseModel):
    name: str
    description: Optional[str] = None
    currency: CurrencyEnum = CurrencyEnum.BRL
    benchmark: str = "CDI"

class PortfolioCreate(PortfolioBase):
    pass

class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[CurrencyEnum] = None
    benchmark: Optional[str] = None

class Portfolio(PortfolioBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    total_value: Optional[float] = None
    total_invested: Optional[float] = None
    total_return: Optional[float] = None
    total_return_percentage: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)

# Asset Schemas
class AssetBase(BaseModel):
    symbol: str
    name: str
    asset_type: AssetTypeEnum
    currency: CurrencyEnum = CurrencyEnum.BRL
    isin: Optional[str] = None
    cusip: Optional[str] = None
    exchange: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[AssetTypeEnum] = None
    currency: Optional[CurrencyEnum] = None
    exchange: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None

class Asset(AssetBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    current_price: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)

# Position Schemas
class PositionBase(BaseModel):
    portfolio_id: int
    asset_id: int
    quantity: float
    average_price: float

class PositionCreate(PositionBase):
    pass

class PositionUpdate(BaseModel):
    quantity: Optional[float] = None
    average_price: Optional[float] = None

class Position(PositionBase):
    id: int
    current_price: Optional[float]
    total_invested: float
    current_value: Optional[float]
    realized_pnl: float
    unrealized_pnl: Optional[float]
    dividends_received: float
    last_updated: datetime
    asset: Optional[Asset] = None
    
    model_config = ConfigDict(from_attributes=True)

# Transaction Schemas
class TransactionBase(BaseModel):
    portfolio_id: int
    asset_id: Optional[int] = None
    transaction_type: TransactionTypeEnum
    date: date
    quantity: Optional[float] = None
    price: Optional[float] = None
    total_amount: float
    fees: float = 0
    taxes: float = 0
    currency: CurrencyEnum = CurrencyEnum.BRL
    exchange_rate: float = 1.0
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    date: Optional[date] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    total_amount: Optional[float] = None
    fees: Optional[float] = None
    taxes: Optional[float] = None
    notes: Optional[str] = None

class Transaction(TransactionBase):
    id: int
    created_at: datetime
    asset: Optional[Asset] = None
    
    model_config = ConfigDict(from_attributes=True)

# Price Schemas
class PriceBase(BaseModel):
    asset_id: int
    date: date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: float
    volume: Optional[float] = None
    adjusted_close: Optional[float] = None

class PriceCreate(PriceBase):
    pass

class Price(PriceBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Exchange Rate Schemas
class ExchangeRateBase(BaseModel):
    from_currency: CurrencyEnum
    to_currency: CurrencyEnum
    date: date
    rate: float

class ExchangeRateCreate(ExchangeRateBase):
    pass

class ExchangeRate(ExchangeRateBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Alert Schemas
class AlertBase(BaseModel):
    alert_type: str
    condition: Dict[str, Any]
    message: Optional[str] = None
    is_active: bool = True

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    condition: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    is_active: Optional[bool] = None

class Alert(AlertBase):
    id: int
    user_id: int
    last_triggered: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Dashboard Schemas
class PortfolioSummary(BaseModel):
    portfolio_id: int
    portfolio_name: str
    total_value: float
    total_invested: float
    total_return: float
    total_return_percentage: float
    currency: str
    positions_count: int
    last_update: datetime

class AssetAllocation(BaseModel):
    asset_type: str
    value: float
    percentage: float
    count: int

class PerformanceMetrics(BaseModel):
    daily_return: Optional[float]
    monthly_return: Optional[float]
    yearly_return: Optional[float]
    volatility: Optional[float]
    sharpe_ratio: Optional[float]
    max_drawdown: Optional[float]
    beta: Optional[float]
    alpha: Optional[float]

class DashboardData(BaseModel):
    portfolios: List[PortfolioSummary]
    total_patrimony: float
    total_invested: float
    total_return: float
    total_return_percentage: float
    asset_allocation: List[AssetAllocation]
    performance_metrics: PerformanceMetrics
    recent_transactions: List[Transaction]

# Import/Export Schemas
class ImportRequest(BaseModel):
    portfolio_id: int
    file_format: str  # csv, excel, ofx
    file_content: str  # Base64 encoded file content

class ImportResponse(BaseModel):
    success: bool
    message: str
    imported_count: int
    errors: List[str] = []

# Dividend Enums
class DividendTypeEnum(str, Enum):
    DIVIDEND = "DIVIDEND"  # Dividendo comum
    JCP = "JCP"  # Juros sobre Capital Próprio
    COUPON = "COUPON"  # Cupom de debêntures/FIIs
    RENT = "RENT"  # Aluguel de ação
    BONUS = "BONUS"  # Bonificação em dinheiro
    OTHER = "OTHER"  # Outros tipos

class PaymentFrequencyEnum(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"  
    SEMIANNUAL = "semiannual"
    ANNUAL = "annual"
    EVENTUAL = "eventual"  # Pagamento eventual/único

# Dividend Schemas
class DividendBase(BaseModel):
    dividend_type: DividendTypeEnum
    amount_per_share: float = Field(..., gt=0, description="Valor por ação")
    shares_quantity: float = Field(..., gt=0, description="Quantidade de ações elegíveis")
    payment_date: date = Field(..., description="Data de pagamento")
    ex_dividend_date: Optional[date] = Field(None, description="Data ex-dividendo")
    record_date: Optional[date] = Field(None, description="Data de registro")
    gross_amount: Optional[float] = Field(None, ge=0, description="Valor bruto")
    tax_amount: float = Field(default=0, ge=0, description="Imposto retido")
    frequency: PaymentFrequencyEnum = Field(default=PaymentFrequencyEnum.EVENTUAL)
    is_recurring: bool = Field(default=False, description="Se é pagamento recorrente")
    currency: CurrencyEnum = Field(default=CurrencyEnum.BRL)
    notes: Optional[str] = Field(None, max_length=1000)

class DividendCreate(DividendBase):
    portfolio_id: int
    asset_id: int
    position_id: int

class DividendUpdate(BaseModel):
    dividend_type: Optional[DividendTypeEnum] = None
    amount_per_share: Optional[float] = Field(None, gt=0)
    shares_quantity: Optional[float] = Field(None, gt=0)
    payment_date: Optional[date] = None
    ex_dividend_date: Optional[date] = None
    record_date: Optional[date] = None
    gross_amount: Optional[float] = Field(None, ge=0)
    tax_amount: Optional[float] = Field(None, ge=0)
    frequency: Optional[PaymentFrequencyEnum] = None
    is_recurring: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=1000)

class Dividend(DividendBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    portfolio_id: int
    asset_id: int
    position_id: int
    total_amount: float
    net_amount: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# UserProfile Schemas
class UserProfileBase(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    profile_visible: bool = True

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    profile_visible: Optional[bool] = None

class UserProfile(UserProfileBase):
    id: int
    user_id: int
    email_verified: bool = False
    phone_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# UserSettings Schemas
class UserSettingsBase(BaseModel):
    theme: ThemeModeEnum = ThemeModeEnum.LIGHT
    language: LanguageEnum = LanguageEnum.PT_BR
    currency: CurrencyEnum = CurrencyEnum.BRL
    email_notifications: bool = True
    push_notifications: bool = True
    sms_notifications: bool = False
    portfolio_alerts: bool = True
    price_alerts: bool = True
    news_notifications: bool = False
    show_portfolio_value: bool = True
    two_factor_enabled: bool = False
    decimal_places: int = 2
    chart_type: ChartTypeEnum = ChartTypeEnum.LINE
    refresh_interval: int = 60
    compact_view: bool = False

class UserSettingsCreate(UserSettingsBase):
    pass

class UserSettingsUpdate(BaseModel):
    theme: Optional[ThemeModeEnum] = None
    language: Optional[LanguageEnum] = None
    currency: Optional[CurrencyEnum] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    portfolio_alerts: Optional[bool] = None
    price_alerts: Optional[bool] = None
    news_notifications: Optional[bool] = None
    show_portfolio_value: Optional[bool] = None
    two_factor_enabled: Optional[bool] = None
    decimal_places: Optional[int] = None
    chart_type: Optional[ChartTypeEnum] = None
    refresh_interval: Optional[int] = None
    compact_view: Optional[bool] = None

class UserSettings(UserSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Change Password Schema
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Advanced Calculation Schemas
class YieldMetrics(BaseModel):
    """Métricas de rendimento avançadas"""
    yield_on_cost: float = Field(..., description="Yield on Cost (%)")
    current_yield: float = Field(..., description="Yield atual (%)")
    annual_dividend_income: float = Field(..., description="Renda anual projetada")
    monthly_dividend_income: float = Field(..., description="Renda mensal projetada")
    total_dividends_received: float = Field(..., description="Total de dividendos recebidos")
    dividend_growth_rate: Optional[float] = Field(None, description="Taxa de crescimento de dividendos (%)")

class CapitalGainMetrics(BaseModel):
    """Métricas de ganho de capital"""
    total_invested: float = Field(..., description="Total investido")
    current_value: float = Field(..., description="Valor atual")
    capital_gain: float = Field(..., description="Ganho de capital")
    capital_gain_percentage: float = Field(..., description="Ganho de capital (%)")
    average_purchase_price: float = Field(..., description="Preço médio de compra")
    current_price: float = Field(..., description="Preço atual")

class TotalReturnMetrics(BaseModel):
    """Rentabilidade total incluindo dividendos"""
    total_return: float = Field(..., description="Retorno total (capital + dividendos)")
    total_return_percentage: float = Field(..., description="Retorno total (%)")
    capital_gain: float = Field(..., description="Ganho de capital")
    dividend_income: float = Field(..., description="Renda de dividendos")
    annualized_return: Optional[float] = Field(None, description="Retorno anualizado (%)")

class CashflowProjection(BaseModel):
    """Projeção de fluxo de caixa"""
    date: str = Field(..., description="Data do pagamento")
    amount: float = Field(..., description="Valor projetado")
    dividend_type: DividendTypeEnum = Field(..., description="Tipo de dividendo")
    asset_symbol: str = Field(..., description="Símbolo do ativo")
    frequency: PaymentFrequencyEnum = Field(..., description="Frequência")
    is_projected: bool = Field(..., description="Se é projeção ou histórico")

class AdvancedPortfolioMetrics(BaseModel):
    """Métricas avançadas do portfólio"""
    yield_metrics: YieldMetrics
    capital_gain_metrics: CapitalGainMetrics  
    total_return_metrics: TotalReturnMetrics
    cashflow_projections: List[CashflowProjection] = Field(default_factory=list)
    
    # Métricas por ativo
    asset_metrics: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
