-- 1. Table par RLS ensure karein ke on ho
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 2. Policy banayein taake app easily data read, insert aur update kar sake
CREATE POLICY "Enable all access for customers" 
ON customers 
FOR ALL 
USING (true) 
WITH CHECK (true);