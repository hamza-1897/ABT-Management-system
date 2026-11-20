CREATE OR REPLACE FUNCTION public.reverse_supplier_payment(
    p_ledger_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entry RECORD;
    v_amount NUMERIC(15, 2);
BEGIN
    SELECT * INTO v_entry
    FROM public.supplier_ledger
    WHERE id = p_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment entry nahi mili (ho sakta hai pehle hi reverse ho chuki ho)!';
    END IF;

    v_amount := COALESCE(v_entry.debit, 0);

    IF v_amount <= 0 THEN
        RAISE EXCEPTION 'Yeh row valid supplier payment (debit) nahi hai!';
    END IF;

    -- 1. Agar account_id linked hai toh Bank / Petty Cash ka balance wapas add karein
    IF v_entry.account_id IS NOT NULL THEN
        UPDATE public.accounts
        SET current_balance = COALESCE(current_balance, 0) + v_amount
        WHERE id = v_entry.account_id;
    END IF;

    -- 2. Supplier ledger se payment entry delete karein
    DELETE FROM public.supplier_ledger
    WHERE id = p_ledger_id;

    RETURN TRUE;
END;
$$;