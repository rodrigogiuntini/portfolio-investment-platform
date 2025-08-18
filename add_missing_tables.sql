-- Add missing tables that the code expects

-- 1. Create prices table (for asset price history)
CREATE TABLE IF NOT EXISTS prices (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) NOT NULL,
    date DATE NOT NULL,
    open DECIMAL(15,2),
    high DECIMAL(15,2),
    low DECIMAL(15,2),
    close DECIMAL(15,2) NOT NULL,
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create indexes for prices table
CREATE INDEX IF NOT EXISTS idx_prices_asset_id ON prices(asset_id);
CREATE INDEX IF NOT EXISTS idx_prices_date ON prices(date);
CREATE INDEX IF NOT EXISTS idx_prices_asset_date ON prices(asset_id, date);

-- 3. Insert some sample price data for existing assets
INSERT INTO prices (asset_id, date, close, volume) 
SELECT 
    id,
    CURRENT_DATE,
    CASE 
        WHEN symbol = 'PETR4' THEN 28.50
        WHEN symbol = 'VALE3' THEN 65.20
        WHEN symbol = 'ITUB4' THEN 32.10
        WHEN symbol = 'BBDC4' THEN 25.80
        WHEN symbol = 'ABEV3' THEN 12.45
        WHEN symbol = 'AAPL' THEN 185.25
        WHEN symbol = 'MSFT' THEN 378.90
        WHEN symbol = 'GOOGL' THEN 142.30
        ELSE 100.00
    END as close,
    1000000 as volume
FROM assets 
WHERE id NOT IN (SELECT DISTINCT asset_id FROM prices WHERE asset_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- 4. Update positions table to have correct structure if it exists
-- Add missing columns to positions if they don't exist
DO $$
BEGIN
    -- Check if positions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'positions') THEN
        -- Add missing columns
        ALTER TABLE positions ADD COLUMN IF NOT EXISTS current_price DECIMAL(15,2);
        ALTER TABLE positions ADD COLUMN IF NOT EXISTS current_value DECIMAL(15,2);
        ALTER TABLE positions ADD COLUMN IF NOT EXISTS realized_pnl DECIMAL(15,2) DEFAULT 0;
        ALTER TABLE positions ADD COLUMN IF NOT EXISTS unrealized_pnl DECIMAL(15,2);
        ALTER TABLE positions ADD COLUMN IF NOT EXISTS dividends_received DECIMAL(15,2) DEFAULT 0;
        ALTER TABLE positions ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 5. Create some sample assets if table is empty
INSERT INTO assets (symbol, name, asset_type, currency, sector, industry) VALUES 
('PETR4', 'Petrobras PN', 'STOCK', 'BRL', 'Energy', 'Oil & Gas'),
('VALE3', 'Vale ON', 'STOCK', 'BRL', 'Materials', 'Mining'),
('ITUB4', 'Itaú Unibanco PN', 'STOCK', 'BRL', 'Financial', 'Banking'),
('BBDC4', 'Bradesco PN', 'STOCK', 'BRL', 'Financial', 'Banking'),
('ABEV3', 'Ambev ON', 'STOCK', 'BRL', 'Consumer Staples', 'Beverages'),
('AAPL', 'Apple Inc', 'STOCK', 'USD', 'Technology', 'Consumer Electronics'),
('MSFT', 'Microsoft Corp', 'STOCK', 'USD', 'Technology', 'Software'),
('GOOGL', 'Alphabet Inc', 'STOCK', 'USD', 'Technology', 'Internet Services')
ON CONFLICT (symbol) DO NOTHING;

-- Success message
SELECT 'Missing tables and sample data added successfully!' as message;
