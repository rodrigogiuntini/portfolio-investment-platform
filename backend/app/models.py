from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Enum as SQLEnum, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class AssetType(enum.Enum):
    STOCK = "STOCK"
    BOND = "BOND"
    FUND = "FUND"
    ETF = "ETF"
    CRYPTO = "CRYPTO"
    REAL_ESTATE = "REAL_ESTATE"
    COMMODITY = "COMMODITY"
    CASH = "CASH"
    OTHER = "OTHER"

class TransactionType(enum.Enum):
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

class Currency(enum.Enum):
    BRL = "BRL"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"

class ThemeMode(enum.Enum):
    LIGHT = "LIGHT"
    DARK = "DARK"
    AUTO = "AUTO"

class Language(enum.Enum):
    PT_BR = "PT_BR"
    EN_US = "EN_US" 
    ES_ES = "ES_ES"

class ChartType(enum.Enum):
    LINE = "LINE"
    CANDLESTICK = "CANDLESTICK"
    AREA = "AREA"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    portfolios = relationship("Portfolio", back_populates="owner", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Basic profile info
    name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    website = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    
    # Profile settings
    profile_visible = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="profile")

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Appearance settings
    theme = Column(SQLEnum(ThemeMode), default=ThemeMode.LIGHT)
    language = Column(SQLEnum(Language), default=Language.PT_BR)
    currency = Column(SQLEnum(Currency), default=Currency.BRL)
    
    # Notification settings (JSON)
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=False)
    portfolio_alerts = Column(Boolean, default=True)
    price_alerts = Column(Boolean, default=True)
    news_notifications = Column(Boolean, default=False)
    
    # Privacy settings
    show_portfolio_value = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    
    # Display settings
    decimal_places = Column(Integer, default=2)
    chart_type = Column(SQLEnum(ChartType), default=ChartType.LINE)
    refresh_interval = Column(Integer, default=60)  # seconds
    compact_view = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="settings")

class Portfolio(Base):
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    currency = Column(SQLEnum(Currency), default=Currency.BRL)
    benchmark = Column(String, default="CDI")  # CDI, IBOV, SP500, etc.
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    owner = relationship("User", back_populates="portfolios")
    positions = relationship("Position", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")
    dividends = relationship("Dividend", back_populates="portfolio", cascade="all, delete-orphan")
    
class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    asset_type = Column(SQLEnum(AssetType), nullable=False)
    currency = Column(SQLEnum(Currency), default=Currency.BRL)
    isin = Column(String, index=True)  # International Securities Identification Number
    cusip = Column(String)  # Committee on Uniform Securities Identification Procedures
    exchange = Column(String)  # B3, NYSE, NASDAQ, etc.
    sector = Column(String)
    industry = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    positions = relationship("Position", back_populates="asset")
    transactions = relationship("Transaction", back_populates="asset")
    prices = relationship("Price", back_populates="asset", cascade="all, delete-orphan")
    dividends = relationship("Dividend", back_populates="asset", cascade="all, delete-orphan")

class Position(Base):
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    average_price = Column(Float, nullable=False, default=0)
    current_price = Column(Float)
    total_invested = Column(Float, nullable=False, default=0)
    current_value = Column(Float)
    realized_pnl = Column(Float, default=0)  # Profit and Loss realizado
    unrealized_pnl = Column(Float)  # Profit and Loss não realizado
    dividends_received = Column(Float, default=0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    
    portfolio = relationship("Portfolio", back_populates="positions")
    asset = relationship("Asset", back_populates="positions")
    dividends = relationship("Dividend", back_populates="position", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    date = Column(Date, nullable=False)
    quantity = Column(Float)
    price = Column(Float)
    total_amount = Column(Float, nullable=False)
    fees = Column(Float, default=0)
    taxes = Column(Float, default=0)
    currency = Column(SQLEnum(Currency), default=Currency.BRL)
    exchange_rate = Column(Float, default=1.0)
    notes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    portfolio = relationship("Portfolio", back_populates="transactions")
    asset = relationship("Asset", back_populates="transactions")

class Price(Base):
    __tablename__ = "prices"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float, nullable=False)
    volume = Column(Float)
    adjusted_close = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    asset = relationship("Asset", back_populates="prices")

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(SQLEnum(Currency), nullable=False)
    to_currency = Column(SQLEnum(Currency), nullable=False)
    date = Column(Date, nullable=False, index=True)
    rate = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type = Column(String, nullable=False)  # concentration, volatility, target_allocation, etc.
    condition = Column(JSON, nullable=False)  # Condições do alerta em JSON
    message = Column(String)
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="alerts")

class Benchmark(Base):
    __tablename__ = "benchmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, nullable=False)  # CDI, IBOV, SP500, etc.
    name = Column(String, nullable=False)
    date = Column(Date, nullable=False, index=True)
    value = Column(Float, nullable=False)
    daily_return = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Enum for dividend types
class DividendType(str, enum.Enum):
    DIVIDEND = "DIVIDEND"  # Dividendo comum
    JCP = "JCP"  # Juros sobre Capital Próprio
    COUPON = "COUPON"  # Cupom de debêntures/FIIs
    RENT = "RENT"  # Aluguel de ação
    BONUS = "BONUS"  # Bonificação em dinheiro
    OTHER = "OTHER"  # Outros tipos

# Enum for payment frequency
class PaymentFrequency(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"  
    SEMIANNUAL = "semiannual"
    ANNUAL = "annual"
    EVENTUAL = "eventual"  # Pagamento eventual/único

class Dividend(Base):
    __tablename__ = "dividends"
    
    id = Column(Integer, primary_key=True, index=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    
    # Dividend details
    dividend_type = Column(SQLEnum(DividendType), nullable=False)
    amount_per_share = Column(Float, nullable=False)  # Valor por ação
    total_amount = Column(Float, nullable=False)  # Valor total recebido
    shares_quantity = Column(Float, nullable=False)  # Quantidade de ações elegíveis
    
    # Dates
    ex_dividend_date = Column(Date, nullable=True)  # Data ex-dividendo
    record_date = Column(Date, nullable=True)  # Data de registro
    payment_date = Column(Date, nullable=False)  # Data de pagamento
    
    # Tax information
    gross_amount = Column(Float, nullable=True)  # Valor bruto (antes dos impostos)
    tax_amount = Column(Float, default=0)  # Imposto retido
    net_amount = Column(Float, nullable=True)  # Valor líquido recebido
    
    # Frequency and projections
    frequency = Column(SQLEnum(PaymentFrequency), default=PaymentFrequency.EVENTUAL)
    is_recurring = Column(Boolean, default=False)  # Se é um pagamento recorrente
    
    # Metadata
    currency = Column(SQLEnum(Currency), default=Currency.BRL)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    position = relationship("Position", back_populates="dividends")
    asset = relationship("Asset", back_populates="dividends")
    portfolio = relationship("Portfolio", back_populates="dividends")
