-- 1. Products Table Create Karein (Supplier-linked)
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    stock_quantity NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Row Level Security (RLS) Enable Karein
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 3. Access Policy Banayein
CREATE POLICY "Enable all access for products" 
ON products 
FOR ALL 
USING (true) 
WITH CHECK (true);