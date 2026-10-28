CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    opening_balance NUMERIC DEFAULT 0,
    include_in_dashboard BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Agar table pehle se bani hui hai toh yeh columns safely add ho jayenge
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS include_in_dashboard BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for suppliers" ON suppliers;
CREATE POLICY "Enable all access for suppliers" 
ON suppliers 
FOR ALL 
USING (true) 
WITH CHECK (true);