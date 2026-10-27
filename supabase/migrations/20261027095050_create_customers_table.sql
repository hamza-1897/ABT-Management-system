CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    short_code TEXT,
    market TEXT,
    phone TEXT,
    opening_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);