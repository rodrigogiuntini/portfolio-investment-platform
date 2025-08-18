-- =====================================================
-- PORTFOLIO INVESTMENT PLATFORM - COMPLETE DATABASE EXPORT
-- Generated: 2025-01-18
-- =====================================================

-- Drop existing tables (if needed for clean install)
DROP TABLE IF EXISTS dividends CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS asset_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS currency CASCADE;
DROP TYPE IF EXISTS theme_mode CASCADE;
DROP TYPE IF EXISTS language CASCADE;
DROP TYPE IF EXISTS chart_type CASCADE;

-- =====================================================
-- CREATE ENUM TYPES
-- =====================================================

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

-- =====================================================
-- CREATE TABLES
-- =====================================================

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
    currency currency DEFAULT 'BRL',
    benchmark VARCHAR(50),
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
    isin VARCHAR(12),
    cusip VARCHAR(9),
    exchange VARCHAR(10),
    sector VARCHAR(100),
    industry VARCHAR(100),
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

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_assets_symbol ON assets(symbol);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_dividends_portfolio_id ON dividends(portfolio_id);
CREATE INDEX idx_dividends_asset_id ON dividends(asset_id);
CREATE INDEX idx_dividends_payment_date ON dividends(payment_date);

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at 
    BEFORE UPDATE ON portfolios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at 
    BEFORE UPDATE ON assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dividends_updated_at 
    BEFORE UPDATE ON dividends 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERT SAMPLE DATA
-- =====================================================

-- Insert demo user (password: demo123)
INSERT INTO users (email, username, hashed_password) VALUES 
('demo@portfolio.com', 'demo', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4f1y2.B22u');

-- Insert user settings for demo user
INSERT INTO user_settings (user_id, theme_mode, language, default_currency) VALUES 
(1, 'LIGHT', 'PT_BR', 'BRL');

-- Insert sample portfolios
INSERT INTO portfolios (name, description, user_id, currency) VALUES 
('Carteira Principal', 'Portfólio principal de investimentos', 1, 'BRL'),
('Carteira Internacional', 'Investimentos em mercados internacionais', 1, 'USD'),
('Carteira Conservadora', 'Investimentos de baixo risco', 1, 'BRL');

-- Insert Brazilian assets
INSERT INTO assets (symbol, name, asset_type, currency, sector, industry) VALUES 
-- Ações Brasileiras
('PETR4', 'Petrobras PN', 'STOCK', 'BRL', 'Energy', 'Oil & Gas'),
('VALE3', 'Vale ON', 'STOCK', 'BRL', 'Materials', 'Mining'),
('ITUB4', 'Itaú Unibanco PN', 'STOCK', 'BRL', 'Financial', 'Banking'),
('BBDC4', 'Bradesco PN', 'STOCK', 'BRL', 'Financial', 'Banking'),
('ABEV3', 'Ambev ON', 'STOCK', 'BRL', 'Consumer Staples', 'Beverages'),
('WEGE3', 'WEG ON', 'STOCK', 'BRL', 'Industrials', 'Electrical Equipment'),
('MGLU3', 'Magazine Luiza ON', 'STOCK', 'BRL', 'Consumer Discretionary', 'E-commerce'),
('RENT3', 'Localiza ON', 'STOCK', 'BRL', 'Industrials', 'Car Rental'),
('LREN3', 'Lojas Renner ON', 'STOCK', 'BRL', 'Consumer Discretionary', 'Retail'),
('JBSS3', 'JBS ON', 'STOCK', 'BRL', 'Consumer Staples', 'Food Processing'),

-- ETFs Brasileiros
('BOVA11', 'iShares Ibovespa', 'ETF', 'BRL', 'Financial', 'Index Fund'),
('SMAL11', 'iShares Small Cap', 'ETF', 'BRL', 'Financial', 'Index Fund'),
('IVVB11', 'iShares S&P 500', 'ETF', 'BRL', 'Financial', 'Index Fund'),

-- FIIs
('HGLG11', 'CSHG Logística', 'REAL_ESTATE', 'BRL', 'Real Estate', 'Logistics'),
('XPLG11', 'XP Log', 'REAL_ESTATE', 'BRL', 'Real Estate', 'Logistics'),
('VISC11', 'Vinci Shopping Centers', 'REAL_ESTATE', 'BRL', 'Real Estate', 'Shopping Centers'),

-- Ações Americanas
('AAPL', 'Apple Inc', 'STOCK', 'USD', 'Technology', 'Consumer Electronics'),
('MSFT', 'Microsoft Corp', 'STOCK', 'USD', 'Technology', 'Software'),
('GOOGL', 'Alphabet Inc', 'STOCK', 'USD', 'Technology', 'Internet Services'),
('AMZN', 'Amazon.com Inc', 'STOCK', 'USD', 'Consumer Discretionary', 'E-commerce'),
('TSLA', 'Tesla Inc', 'STOCK', 'USD', 'Consumer Discretionary', 'Electric Vehicles'),

-- Criptomoedas
('BTC', 'Bitcoin', 'CRYPTO', 'USD', 'Technology', 'Cryptocurrency'),
('ETH', 'Ethereum', 'CRYPTO', 'USD', 'Technology', 'Cryptocurrency'),

-- Renda Fixa
('TESOURO_SELIC', 'Tesouro Selic', 'BOND', 'BRL', 'Government', 'Treasury Bond'),
('TESOURO_IPCA', 'Tesouro IPCA+', 'BOND', 'BRL', 'Government', 'Treasury Bond'),
('CDB_BANCO', 'CDB Banco', 'BOND', 'BRL', 'Financial', 'Bank Certificate');

-- Insert sample transactions
INSERT INTO transactions (portfolio_id, asset_id, transaction_type, quantity, price, total_value, transaction_date, notes) VALUES 
-- Carteira Principal
(1, 1, 'BUY', 100, 28.50, 2850.00, '2024-01-15', 'Compra inicial PETR4'),
(1, 2, 'BUY', 50, 65.20, 3260.00, '2024-01-20', 'Compra inicial VALE3'),
(1, 3, 'BUY', 200, 32.10, 6420.00, '2024-02-01', 'Compra inicial ITUB4'),
(1, 11, 'BUY', 10, 98.50, 985.00, '2024-02-15', 'Compra ETF BOVA11'),

-- Carteira Internacional  
(2, 17, 'BUY', 5, 185.25, 926.25, '2024-01-10', 'Compra AAPL'),
(2, 18, 'BUY', 3, 378.90, 1136.70, '2024-01-25', 'Compra MSFT'),

-- Carteira Conservadora
(3, 23, 'BUY', 1000, 10.50, 10500.00, '2024-01-05', 'Aplicação Tesouro Selic'),
(3, 25, 'BUY', 500, 12.80, 6400.00, '2024-02-10', 'Aplicação CDB');

-- Insert sample dividends
INSERT INTO dividends (portfolio_id, asset_id, amount, payment_date, dividend_type, notes) VALUES 
(1, 1, 85.50, '2024-03-15', 'CASH', 'Dividendos PETR4'),
(1, 2, 125.30, '2024-03-20', 'CASH', 'Dividendos VALE3'),
(1, 3, 64.20, '2024-04-01', 'CASH', 'Dividendos ITUB4'),
(1, 14, 45.80, '2024-03-25', 'CASH', 'Rendimentos HGLG11'),
(2, 17, 12.50, '2024-03-10', 'CASH', 'Dividendos AAPL');

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Portfolio summary view
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.currency,
    u.username as owner,
    COUNT(DISTINCT t.asset_id) as total_assets,
    SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_value ELSE 0 END) as total_invested,
    SUM(CASE WHEN t.transaction_type = 'SELL' THEN t.total_value ELSE 0 END) as total_sold,
    COALESCE(SUM(d.amount), 0) as total_dividends,
    p.created_at
FROM portfolios p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN transactions t ON p.id = t.portfolio_id
LEFT JOIN dividends d ON p.id = d.portfolio_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.description, p.currency, u.username, p.created_at;

-- Asset allocation view
CREATE OR REPLACE VIEW asset_allocation AS
SELECT 
    p.id as portfolio_id,
    p.name as portfolio_name,
    a.asset_type,
    COUNT(*) as asset_count,
    SUM(t.total_value) as total_value,
    ROUND(
        (SUM(t.total_value) * 100.0 / 
         SUM(SUM(t.total_value)) OVER (PARTITION BY p.id)), 2
    ) as percentage
FROM portfolios p
JOIN transactions t ON p.id = t.portfolio_id
JOIN assets a ON t.asset_id = a.id
WHERE p.is_active = true AND t.transaction_type = 'BUY'
GROUP BY p.id, p.name, a.asset_type;

-- Monthly performance view
CREATE OR REPLACE VIEW monthly_performance AS
SELECT 
    p.id as portfolio_id,
    p.name as portfolio_name,
    DATE_TRUNC('month', t.transaction_date) as month,
    SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_value ELSE 0 END) as invested,
    SUM(CASE WHEN t.transaction_type = 'SELL' THEN t.total_value ELSE 0 END) as sold,
    COALESCE(SUM(d.amount), 0) as dividends_received
FROM portfolios p
LEFT JOIN transactions t ON p.id = t.portfolio_id
LEFT JOIN dividends d ON p.id = d.portfolio_id AND DATE_TRUNC('month', d.payment_date) = DATE_TRUNC('month', t.transaction_date)
WHERE p.is_active = true
GROUP BY p.id, p.name, DATE_TRUNC('month', t.transaction_date)
ORDER BY p.id, month;

-- =====================================================
-- FUNCTIONS FOR CALCULATIONS
-- =====================================================

-- Function to calculate portfolio total value
CREATE OR REPLACE FUNCTION calculate_portfolio_value(portfolio_id_param INTEGER)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    total_value DECIMAL(15,2) := 0;
BEGIN
    SELECT COALESCE(
        SUM(CASE 
            WHEN t.transaction_type = 'BUY' THEN t.total_value 
            WHEN t.transaction_type = 'SELL' THEN -t.total_value 
            ELSE 0 
        END), 0
    ) INTO total_value
    FROM transactions t
    WHERE t.portfolio_id = portfolio_id_param;
    
    RETURN total_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get asset positions
CREATE OR REPLACE FUNCTION get_asset_positions(portfolio_id_param INTEGER)
RETURNS TABLE(
    asset_symbol VARCHAR(20),
    asset_name VARCHAR(255),
    total_quantity DECIMAL(15,6),
    average_price DECIMAL(15,2),
    total_invested DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.symbol,
        a.name,
        SUM(CASE 
            WHEN t.transaction_type = 'BUY' THEN t.quantity 
            WHEN t.transaction_type = 'SELL' THEN -t.quantity 
            ELSE 0 
        END) as total_quantity,
        CASE 
            WHEN SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE 0 END) > 0 
            THEN SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_value ELSE 0 END) / 
                 SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE 0 END)
            ELSE 0 
        END as average_price,
        SUM(CASE 
            WHEN t.transaction_type = 'BUY' THEN t.total_value 
            WHEN t.transaction_type = 'SELL' THEN -t.total_value 
            ELSE 0 
        END) as total_invested
    FROM transactions t
    JOIN assets a ON t.asset_id = a.id
    WHERE t.portfolio_id = portfolio_id_param
    GROUP BY a.symbol, a.name
    HAVING SUM(CASE 
        WHEN t.transaction_type = 'BUY' THEN t.quantity 
        WHEN t.transaction_type = 'SELL' THEN -t.quantity 
        ELSE 0 
    END) > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Portfolio Investment Platform Database created successfully!' as message,
       'Total tables: 6' as tables,
       'Total views: 3' as views,
       'Total functions: 2' as functions,
       'Sample data included' as data_status;
