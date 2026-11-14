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
BEGIN
    -- Total amount calculation (Tons * Rate per Ton)
    SELECT COALESCE(SUM((item->>'unit_price')::NUMERIC * (item->>'quantity')::NUMERIC), 0)
    INTO v_total_amount
    FROM jsonb_array_elements(p_items) AS item;

    -- 1. Main Invoice Insert
    INSERT INTO public.purchases (purchase_date, supplier_id, invoice_number, total_amount)
    VALUES (p_purchase_date, p_supplier_id, TRIM(p_invoice_number), v_total_amount)
    RETURNING id INTO v_purchase_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_tons := (v_item->>'quantity')::NUMERIC; -- Yahan quantity Tons mein hai
        v_bags := v_tons * 20;                    -- 1 Ton = 20 Bags conversion
        v_net_amount := (v_item->>'unit_price')::NUMERIC * v_tons;

        SELECT name INTO v_product_name FROM public.products WHERE id = (v_item->>'product_id')::UUID;

        -- A. Purchase Item Insert (Record mein Tons save hoga)
        INSERT INTO public.purchase_items (
            purchase_id, vehicle_number, product_id, unit_price, quantity, net_amount
        ) VALUES (
            v_purchase_id,
            UPPER(TRIM(v_item->>'vehicle_number')),
            (v_item->>'product_id')::UUID,
            (v_item->>'unit_price')::NUMERIC,
            v_tons,
            v_net_amount
        );

        -- B. Stock Update in Bags (Tons * 20 = Bags added to stock)
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) + v_bags
        WHERE id = (v_item->>'product_id')::UUID;

        -- C. Supplier Ledger Entry (Tons ke hisab se description aur credit)
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
            'Purchase: ' || COALESCE(v_product_name, 'Item') || ' (' || v_tons || ' Tons @ ' || (v_item->>'unit_price') || ')',
            0,
            v_net_amount
        );
    END LOOP;

    RETURN v_purchase_id;
END;
$$;