-- Portfolio Investment Platform - Database Schema
-- Execute este SQL no Supabase SQL Editor

-- Create ENUM types
CREATE TYPE asset_type AS ENUM (
    'STOCK', 'BOND', 'FUND', 'ETF', 'CRYPTO', 
    'REAL_ESTATE', 'COMMODITY', 'CASH', 'OTHER'
);

CREATE TYPE transaction_type AS ENUM (
    'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'DEPOSIT', 
    'WITHDRAW', 'FEE', 'TAX', 'SPLIT', 'BONUS'
);

CREATE TYPE currency AS ENUM ('BRL', 'USD', 'EUR', 'GBP', 'JPY');

CREATE TYPE theme_mode AS ENUM ('LIGHT', 'DARK', 'AUTO');

CREATE TYPE language AS ENUM ('PT_BR', 'EN_US', 'ES_ES');

CREATE TYPE chart_type AS ENUM ('LINE', 'CANDLESTICK', 'AREA');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Settings table
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    theme_mode theme_mode DEFAULT 'LIGHT',
    language language DEFAULT 'PT_BR',
    default_currency currency DEFAULT 'BRL',
    chart_type chart_type DEFAULT 'LINE',
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios table
CREATE TABLE portfolios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    asset_type asset_type NOT NULL,
    currency currency DEFAULT 'BRL',
    sector VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    quantity DECIMAL(15,6) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    fees DECIMAL(15,2) DEFAULT 0,
    taxes DECIMAL(15,2) DEFAULT 0,
    currency currency DEFAULT 'BRL',
    transaction_date DATE NOT NULL,
    notes TEXT,
    cupom_valor_mercado DECIMAL(15,2),
    yield_percentage DECIMAL(8,4),
    yield_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dividends table
CREATE TABLE dividends (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency currency DEFAULT 'BRL',
    payment_date DATE NOT NULL,
    record_date DATE,
    dividend_type VARCHAR(50) DEFAULT 'CASH',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_assets_symbol ON assets(symbol);
CREATE INDEX idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_dividends_portfolio_id ON dividends(portfolio_id);
CREATE INDEX idx_dividends_asset_id ON dividends(asset_id);
CREATE INDEX idx_dividends_payment_date ON dividends(payment_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dividends_updated_at BEFORE UPDATE ON dividends 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO users (email, username, hashed_password) VALUES 
('demo@portfolio.com', 'demo', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4f1y2.B22u'); -- password: demo123

INSERT INTO assets (symbol, name, asset_type, currency, sector) VALUES 
('PETR4', 'Petrobras PN', 'STOCK', 'BRL', 'Energy'),
('VALE3', 'Vale ON', 'STOCK', 'BRL', 'Materials'),
('ITUB4', 'Itaú Unibanco PN', 'STOCK', 'BRL', 'Financial'),
('BBDC4', 'Bradesco PN', 'STOCK', 'BRL', 'Financial'),
('ABEV3', 'Ambev ON', 'STOCK', 'BRL', 'Consumer Staples'),
('AAPL', 'Apple Inc', 'STOCK', 'USD', 'Technology'),
('MSFT', 'Microsoft Corp', 'STOCK', 'USD', 'Technology'),
('GOOGL', 'Alphabet Inc', 'STOCK', 'USD', 'Technology');

-- Success message
SELECT 'Database schema created successfully!' as message;
