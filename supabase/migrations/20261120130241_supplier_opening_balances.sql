-- 1. Pehle se mojood suppliers ka opening_balance agar supplier_ledger mein nahi hai toh add karein
INSERT INTO public.supplier_ledger (
    supplier_id,
    transaction_date,
    invoice_number,
    vehicle_number,
    booking_area,
    description,
    debit,
    credit
)
SELECT
    s.id,
    COALESCE(s.created_at::DATE, CURRENT_DATE),
    'OPENING-BAL',
    '-',
    NULL,
    'Opening Balance',
    0,
    s.opening_balance
FROM public.suppliers s
WHERE COALESCE(s.opening_balance, 0) > 0
  AND NOT EXISTS (
      SELECT 1
      FROM public.supplier_ledger sl
      WHERE sl.supplier_id = s.id
        AND sl.invoice_number = 'OPENING-BAL'
  );

-- 2. Naye supplier ke opening_balance ko automatically supplier_ledger mein sync karne ka trigger
CREATE OR REPLACE FUNCTION public.sync_supplier_opening_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND COALESCE(NEW.opening_balance, 0) > 0 THEN
        INSERT INTO public.supplier_ledger (
            supplier_id,
            transaction_date,
            invoice_number,
            vehicle_number,
            booking_area,
            description,
            debit,
            credit
        ) VALUES (
            NEW.id,
            COALESCE(NEW.created_at::DATE, CURRENT_DATE),
            'OPENING-BAL',
            '-',
            NULL,
            'Opening Balance',
            0,
            NEW.opening_balance
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_supplier_opening_balance ON public.suppliers;

CREATE TRIGGER trg_sync_supplier_opening_balance
AFTER INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.sync_supplier_opening_balance();