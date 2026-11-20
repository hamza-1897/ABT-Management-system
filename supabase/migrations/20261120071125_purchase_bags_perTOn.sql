-- 1. Products table mein bags_per_ton column add karein (Default 20 rakha hai purane products ke liye)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS bags_per_ton NUMERIC(10, 2) DEFAULT 20 NOT NULL;

-- 2. Purchase Entry RPC Function (Ab hardcoded 20 ki bajaye product ka bags_per_ton use karega)
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
    v_bags_per_ton NUMERIC(10, 2);
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
        v_net_amount := (v_item->>'unit_price')::NUMERIC * v_tons;
        v_area := NULLIF(TRIM(v_item->>'booking_area'), '');

        -- Product ka name aur uska specific bags_per_ton fetch karein
        SELECT name, COALESCE(bags_per_ton, 20)
        INTO v_product_name, v_bags_per_ton
        FROM public.products
        WHERE id = (v_item->>'product_id')::UUID;

        -- Dynamic Bags Calculation (e.g. Cement * 20, White Cement * 25, Bond * 50)
        v_bags := v_tons * v_bags_per_ton;

        -- A. Purchase Item Insert
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

        -- B. Stock Update in Dynamic Bags
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) + v_bags
        WHERE id = (v_item->>'product_id')::UUID;

        -- C. Supplier Ledger Entry
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
            'Purchase: ' || COALESCE(v_product_name, 'Item') || ' (' || v_tons || ' Tons / ' || v_bags || ' Bags @ ' || (v_item->>'unit_price') || ')',
            0,
            v_net_amount
        );
    END LOOP;

    RETURN v_purchase_id;
END;
$$;

-- 3. Purchase Reversal RPC Function ko bhi dynamic bags_per_ton par update karein
CREATE OR REPLACE FUNCTION public.reverse_purchase_invoice(
    p_purchase_id UUID,
    p_reversal_date DATE,
    p_reason TEXT DEFAULT 'Purchase Invoice Reversed'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase RECORD;
    v_item RECORD;
    v_bags_per_ton NUMERIC(10, 2);
    v_bags NUMERIC(15, 2);
BEGIN
    SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase invoice nahi mili!';
    END IF;

    IF v_purchase.status = 'REVERSED' THEN
        RAISE EXCEPTION 'Yeh invoice pehle hi reverse ho chuki hai!';
    END IF;

    FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id
    LOOP
        SELECT COALESCE(bags_per_ton, 20) INTO v_bags_per_ton
        FROM public.products WHERE id = v_item.product_id;

        v_bags := v_item.quantity * v_bags_per_ton;

        -- Stock se utne hi bags minus karein jitne add hue thay
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) - v_bags
        WHERE id = v_item.product_id;
    END LOOP;

    DELETE FROM public.supplier_ledger WHERE purchase_id = p_purchase_id;

    UPDATE public.purchases SET status = 'REVERSED' WHERE id = p_purchase_id;

    RETURN TRUE;
END;
$$;