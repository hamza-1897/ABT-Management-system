-- 1. Suppliers Table Create Karein
CREATE TABLE suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    opening_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Row Level Security (RLS) Enable Karein
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 3. Access Policy Banayein (Read/Write Access)
CREATE POLICY "Enable all access for suppliers" 
ON suppliers 
FOR ALL 
USING (true) 
WITH CHECK (true);