-- Recreate tables with exact structure expected by the code
-- This will fix all column mismatches

-- First, let's check what we have and fix it step by step

-- 1. Fix portfolios table structure
-- Drop and recreate to match exact model structure
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS dividends CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;

-- Recreate portfolios with exact structure from models.py
CREATE TABLE portfolios (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    currency currency DEFAULT 'BRL',
    benchmark VARCHAR DEFAULT 'CDI',
    owner_id INTEGER REFERENCES users(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 2. Fix assets table structure  
-- Add missing columns to match models.py exactly
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing assets
UPDATE assets SET is_active = true WHERE is_active IS NULL;

-- 3. Recreate transactions table with exact structure
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) NOT NULL,
    asset_id INTEGER REFERENCES assets(id),
    transaction_type transaction_type NOT NULL,
    date DATE NOT NULL,
    quantity DECIMAL(15,6),
    price DECIMAL(15,2),
    total_amount DECIMAL(15,2) NOT NULL,
    fees DECIMAL(15,2) DEFAULT 0,
    taxes DECIMAL(15,2) DEFAULT 0,
    currency currency DEFAULT 'BRL',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 4. Create positions table (this might be missing)
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) NOT NULL,
    asset_id INTEGER REFERENCES assets(id) NOT NULL,
    quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
    average_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_price DECIMAL(15,2),
    total_invested DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_value DECIMAL(15,2),
    realized_pnl DECIMAL(15,2) DEFAULT 0,
    unrealized_pnl DECIMAL(15,2),
    dividends_received DECIMAL(15,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Recreate dividends table
CREATE TABLE dividends (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) NOT NULL,
    asset_id INTEGER REFERENCES assets(id) NOT NULL,
    position_id INTEGER REFERENCES positions(id),
    amount DECIMAL(15,2) NOT NULL,
    currency currency DEFAULT 'BRL',
    payment_date DATE NOT NULL,
    record_date DATE,
    dividend_type VARCHAR(50) DEFAULT 'CASH',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 6. Create indexes
CREATE INDEX idx_portfolios_owner_id ON portfolios(owner_id);
CREATE INDEX idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_positions_asset_id ON positions(asset_id);
CREATE INDEX idx_dividends_portfolio_id ON dividends(portfolio_id);
CREATE INDEX idx_dividends_asset_id ON dividends(asset_id);

-- 7. Insert sample data
INSERT INTO portfolios (name, description, owner_id, currency, benchmark) VALUES 
('Carteira Principal', 'Portfólio principal de investimentos', 1, 'BRL', 'CDI'),
('Carteira Internacional', 'Investimentos internacionais', 1, 'USD', 'SP500');

-- Success message
SELECT 'Tables recreated successfully with exact model structure!' as message;
