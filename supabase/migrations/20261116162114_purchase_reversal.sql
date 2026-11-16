-- 1. Purchases table mein status column add karein (agar pehle nahi hai)
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- 2. Purchase Reversal ka Atomic RPC Function
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
    v_product_name TEXT;
    v_bags NUMERIC(15, 2);
BEGIN
    -- Purchase record fetch karein aur check karein ke pehle se reversed toh nahi
    SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase invoice nahi mili!';
    END IF;

    IF v_purchase.status = 'REVERSED' THEN
        RAISE EXCEPTION 'Yeh invoice pehle hi reverse ho chuki hai!';
    END IF;

    -- Invoice ke saare items (vehicles) par loop chalayein
    FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id
    LOOP
        v_bags := v_item.quantity * 20; -- Tons to Bags conversion
        SELECT name INTO v_product_name FROM public.products WHERE id = v_item.product_id;

        -- A. Stock mein se Bags wapas minus karein
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) - v_bags
        WHERE id = v_item.product_id;

        -- B. Supplier Ledger mein DEBIT entry dalein (taake company ka balance kam ho)
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
            v_purchase.supplier_id,
            p_purchase_id,
            p_reversal_date,
            v_purchase.invoice_number,
            v_item.vehicle_number,
            'REVERSAL: ' || COALESCE(v_product_name, 'Item') || ' (' || v_item.quantity || ' Tons) - ' || COALESCE(p_reason, ''),
            v_item.net_amount, -- Debit mein amount jayegi
            0
        );
    END LOOP;

    -- C. Purchase invoice ko REVERSED mark kar dein
    UPDATE public.purchases
    SET status = 'REVERSED'
    WHERE id = p_purchase_id;

    RETURN TRUE;
END;
$$;