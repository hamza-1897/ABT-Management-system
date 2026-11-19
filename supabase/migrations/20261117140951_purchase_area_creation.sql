-- 1. Booking Areas Table banayein
CREATE TABLE IF NOT EXISTS public.booking_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default kuch areas add kar dein (baad mein aap UI se mazeed add kar sakte hain)
INSERT INTO public.booking_areas (name) 
VALUES ('Mandi Bahauddin'), ('Malakwal'), ('Phalia'), ('Rasul')
ON CONFLICT (name) DO NOTHING;

-- 2. purchase_items aur supplier_ledger mein booking_area column add karein
ALTER TABLE public.purchase_items 
ADD COLUMN IF NOT EXISTS booking_area TEXT;

ALTER TABLE public.supplier_ledger 
ADD COLUMN IF NOT EXISTS booking_area TEXT;

-- 3. Updated RPC Function (Tons to Bags + Booking Area support)
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
    v_tons NUMERIC(15, 2);
    v_bags NUMERIC(15, 2);
    v_area TEXT;
BEGIN
    SELECT COALESCE(SUM((item->>'unit_price')::NUMERIC * (item->>'quantity')::NUMERIC), 0)
    INTO v_total_amount
    FROM jsonb_array_elements(p_items) AS item;

    INSERT INTO public.purchases (purchase_date, supplier_id, invoice_number, total_amount)
    VALUES (p_purchase_date, p_supplier_id, TRIM(p_invoice_number), v_total_amount)
    RETURNING id INTO v_purchase_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_tons := (v_item->>'quantity')::NUMERIC;
        v_bags := v_tons * 20;
        v_net_amount := (v_item->>'unit_price')::NUMERIC * v_tons;
        v_area := NULLIF(TRIM(v_item->>'booking_area'), '');

        SELECT name INTO v_product_name FROM public.products WHERE id = (v_item->>'product_id')::UUID;

        -- A. Purchase Item Insert with Booking Area
        INSERT INTO public.purchase_items (
            purchase_id, vehicle_number, booking_area, product_id, unit_price, quantity, net_amount
        ) VALUES (
            v_purchase_id,
            UPPER(TRIM(v_item->>'vehicle_number')),
            v_area,
            (v_item->>'product_id')::UUID,
            (v_item->>'unit_price')::NUMERIC,
            v_tons,
            v_net_amount
        );

        -- B. Stock Update in Bags
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) + v_bags
        WHERE id = (v_item->>'product_id')::UUID;

        -- C. Supplier Ledger Entry with Booking Area
        INSERT INTO public.supplier_ledger (
            supplier_id,
            purchase_id,
            transaction_date,
            invoice_number,
            vehicle_number,
            booking_area,
            description,
            debit,
            credit
        ) VALUES (
            p_supplier_id,
            v_purchase_id,
            p_purchase_date,
            TRIM(p_invoice_number),
            UPPER(TRIM(v_item->>'vehicle_number')),
            v_area,
            'Purchase: ' || COALESCE(v_product_name, 'Item') || ' (' || v_tons || ' Tons @ ' || (v_item->>'unit_price') || ')',
            0,
            v_net_amount
        );
    END LOOP;

    RETURN v_purchase_id;
END;
$$;