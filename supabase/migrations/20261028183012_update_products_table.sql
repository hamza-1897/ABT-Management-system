-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    category TEXT DEFAULT 'Cement',
    supplier_id TEXT,
    opening_stock NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Safely add columns if table already exists
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Cement',
ADD COLUMN IF NOT EXISTS supplier_id TEXT,
ADD COLUMN IF NOT EXISTS opening_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Recreate policy safely
DROP POLICY IF EXISTS "Enable all access for products" ON products;
CREATE POLICY "Enable all access for products" 
ON products 
FOR ALL 
USING (true) 
WITH CHECK (true);