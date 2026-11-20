ALTER TABLE public.supplier_ledger
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

CREATE OR REPLACE FUNCTION public.record_supplier_payment(
    p_payment_date DATE,
    p_supplier_id UUID,
    p_account_id UUID,
    p_amount NUMERIC(15, 2),
    p_reference_no TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account RECORD;
    v_supplier RECORD;
    v_ref_text TEXT;
    v_desc TEXT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount 0 se zyada honi chahiye!';
    END IF;

    SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected account nahi mila!';
    END IF;

    SELECT * INTO v_supplier FROM public.suppliers WHERE id = p_supplier_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected supplier nahi mila!';
    END IF;

    -- Bank / Petty Cash account ka current_balance kam karein
    UPDATE public.accounts
    SET current_balance = COALESCE(current_balance, 0) - p_amount
    WHERE id = p_account_id;

    -- Supplier ledger mein date-wise debit entry insert karein
    v_ref_text := COALESCE(NULLIF(TRIM(p_reference_no), ''), 'PAY-' || TO_CHAR(p_payment_date, 'YYYYMMDD'));
    v_desc := 'Payment via ' || COALESCE(v_account.account_name, v_account.bank_name, 'Account') ||
              CASE WHEN p_remarks IS NOT NULL AND TRIM(p_remarks) <> '' THEN ' - ' || TRIM(p_remarks) ELSE '' END;

    INSERT INTO public.supplier_ledger (
        supplier_id,
        account_id,
        transaction_date,
        invoice_number,
        vehicle_number,
        booking_area,
        description,
        debit,
        credit
    ) VALUES (
        p_supplier_id,
        p_account_id,
        p_payment_date,
        v_ref_text,
        '-',
        NULL,
        v_desc,
        p_amount,
        0
    );

    RETURN TRUE;
END;
$$;