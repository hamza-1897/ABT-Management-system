-- Create customers table if it does not exist
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    category TEXT DEFAULT 'General',
    phone TEXT,
    address TEXT,
    opening_balance NUMERIC DEFAULT 0,
    include_in_dashboard BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Safely add columns if they are missing from an older table version
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS include_in_dashboard BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Recreate policy safely
DROP POLICY IF EXISTS "Enable all access for customers" ON customers;
CREATE POLICY "Enable all access for customers" 
ON customers 
FOR ALL 
USING (true) 
WITH CHECK (true);