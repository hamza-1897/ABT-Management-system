-- 1. Pehle se reversed invoices ki entries ko supplier_ledger se saaf karein
DELETE FROM public.supplier_ledger
WHERE purchase_id IN (
    SELECT id FROM public.purchases WHERE status = 'REVERSED'
);

-- 2. Updated Reversal RPC Function (Jo ledger se entry ko mukammal hata dega)
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
    v_bags NUMERIC(15, 2);
BEGIN
    SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase invoice nahi mili!';
    END IF;

    IF v_purchase.status = 'REVERSED' THEN
        RAISE EXCEPTION 'Yeh invoice pehle hi reverse ho chuki hai!';
    END IF;

    -- A. Stock mein se Bags wapas minus karein
    FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id
    LOOP
        v_bags := v_item.quantity * 20;

        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) - v_bags
        WHERE id = v_item.product_id;
    END LOOP;

    -- B. Supplier Ledger se is invoice ki entry ko mukammal DELETE kar dein
    DELETE FROM public.supplier_ledger
    WHERE purchase_id = p_purchase_id;

    -- C. Purchase invoice ko REVERSED mark kar dein (taake Reversal page par history dikhti rahe)
    UPDATE public.purchases
    SET status = 'REVERSED'
    WHERE id = p_purchase_id;

    RETURN TRUE;
END;
$$;