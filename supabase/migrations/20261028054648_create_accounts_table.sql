-- Create unified accounts table
CREATE TABLE accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('CASH', 'BANK')),
    account_number TEXT,
    bank_name TEXT,
    branch_name TEXT,
    opening_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for accounts" 
ON accounts 
FOR ALL 
USING (true) 
WITH CHECK (true);