-- 1. Purchases Master Table (Invoice Header)
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supplier_id, invoice_number)
);

-- 2. Purchase Items Table (Har Vehicle ki alag row)
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    net_amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Supplier Ledger Table (Har vehicle ki alag entry ke liye)
CREATE TABLE IF NOT EXISTS public.supplier_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    invoice_number TEXT,
    vehicle_number TEXT,
    description TEXT NOT NULL,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0,  -- Jab hum company ko payment karein
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Jab company se maal khareedein (Payable barhay ga)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Atomic Function: Purchase Save + Stock Update + Vehicle-wise Ledger Entry
CREATE OR REPLACE FUNCTION public.record_purchase_invoice(
    p_purchase_date DATE,
    p_supplier_id UUID,
    p_invoice_number TEXT,
    p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase_id UUID;
    v_total_amount NUMERIC(15, 2) := 0;
    v_item JSONB;
    v_product_name TEXT;
    v_net_amount NUMERIC(15, 2);
BEGIN
    -- Total amount calculate karein
    SELECT COALESCE(SUM((item->>'unit_price')::NUMERIC * (item->>'quantity')::NUMERIC), 0)
    INTO v_total_amount
    FROM jsonb_array_elements(p_items) AS item;

    -- 1. Main Purchase Invoice insert karein
    INSERT INTO public.purchases (purchase_date, supplier_id, invoice_number, total_amount)
    VALUES (p_purchase_date, p_supplier_id, TRIM(p_invoice_number), v_total_amount)
    RETURNING id INTO v_purchase_id;

    -- 2. Har vehicle row par loop chalayein
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_net_amount := (v_item->>'unit_price')::NUMERIC * (v_item->>'quantity')::NUMERIC;

        -- Product ka naam fetch karein ledger description ke liye
        SELECT name INTO v_product_name FROM public.products WHERE id = (v_item->>'product_id')::UUID;

        -- A. Purchase Item insert karein
        INSERT INTO public.purchase_items (
            purchase_id, vehicle_number, product_id, unit_price, quantity, net_amount
        ) VALUES (
            v_purchase_id,
            UPPER(TRIM(v_item->>'vehicle_number')),
            (v_item->>'product_id')::UUID,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'quantity')::NUMERIC,
            v_net_amount
        );

        -- B. Product ka Stock barhayein (Note: Agar aapke column ka naam 'stock' ya 'current_stock' hai toh yahan check kar lein)
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) + (v_item->>'quantity')::NUMERIC
        WHERE id = (v_item->>'product_id')::UUID;

        -- C. Supplier Ledger mein is vehicle ki ALAG entry dalein
        INSERT INTO public.supplier_ledger (
            supplier_id,
            purchase_id,
            transaction_date,
            invoice_number,
            vehicle_number,
            description,
            debit,
            credit
        ) VALUES (
            p_supplier_id,
            v_purchase_id,
            p_purchase_date,
            TRIM(p_invoice_number),
            UPPER(TRIM(v_item->>'vehicle_number')),
            'Purchase: ' || COALESCE(v_product_name, 'Item') || ' (' || (v_item->>'quantity') || ' x ' || (v_item->>'unit_price') || ') - Vehicle: ' || UPPER(TRIM(v_item->>'vehicle_number')),
            0,
            v_net_amount
        );
    END LOOP;

    RETURN v_purchase_id;
END;
$$;