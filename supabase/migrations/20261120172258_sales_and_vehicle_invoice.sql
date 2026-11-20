-- ============================================================================
-- MODULE 5: SALES & VEHICLE INVOICES (ATOMIC LEDGER, STOCK & REVERSAL)
-- ============================================================================

-- 1. Customers table mein short_code aur opening_balance ensure karein
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS short_code TEXT,
ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15, 2) DEFAULT 0;

-- 2. Vehicle Sales Invoices Header Table
CREATE TABLE IF NOT EXISTS public.sale_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    vehicle_number TEXT NOT NULL,
    petty_cash_account_id UUID REFERENCES public.accounts(id),
    total_bags NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_cash_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_net_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_invoices_number ON public.sale_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_date ON public.sale_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_vehicle ON public.sale_invoices(vehicle_number);

-- 3. Vehicle Sales Invoice Customer Lines Table
CREATE TABLE IF NOT EXISTS public.sale_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_invoice_id UUID NOT NULL REFERENCES public.sale_invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity_bags NUMERIC(15, 2) NOT NULL,
    rate_per_bag NUMERIC(15, 2) NOT NULL,
    line_total NUMERIC(15, 2) NOT NULL,
    cash_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_balance NUMERIC(15, 2) NOT NULL,
    payment_type TEXT NOT NULL, -- 'CASH', 'CREDIT', 'PARTIAL'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_invoice ON public.sale_invoice_items(sale_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_customer ON public.sale_invoice_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_invoice_items(product_id);

-- 4. Customer Ledger Table (Negative = Customer ne dene hain / Receivable)
CREATE TABLE IF NOT EXISTS public.customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    sale_invoice_id UUID REFERENCES public.sale_invoices(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES public.sale_invoice_items(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    invoice_number TEXT,
    vehicle_number TEXT,
    description TEXT,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON public.customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_invoice ON public.customer_ledger(sale_invoice_id);

-- 5. RPC: Create Sale Vehicle Invoice Atomically
CREATE OR REPLACE FUNCTION public.create_sale_vehicle_invoice(
    p_invoice_number TEXT,
    p_invoice_date DATE,
    p_vehicle_number TEXT,
    p_remarks TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id UUID;
    v_petty_cash_id UUID;
    v_item JSONB;
    v_item_id UUID;
    v_customer_id UUID;
    v_product_id UUID;
    v_product_name TEXT;
    v_qty NUMERIC(15, 2);
    v_rate NUMERIC(15, 2);
    v_line_total NUMERIC(15, 2);
    v_cash_paid NUMERIC(15, 2);
    v_net_balance NUMERIC(15, 2);
    v_payment_type TEXT;
    v_total_bags NUMERIC(15, 2) := 0;
    v_total_amount NUMERIC(15, 2) := 0;
    v_total_cash NUMERIC(15, 2) := 0;
    v_total_net NUMERIC(15, 2) := 0;
BEGIN
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Kam az kam aik customer line add karein!';
    END IF;

    -- Default Petty Cash account dhoondein (pehle 'Abu Bakar' / 'ABT', warna koi bhi active cash drawer)
    SELECT id INTO v_petty_cash_id
    FROM public.accounts
    WHERE LOWER(TRIM(account_type)) IN ('petty_cash', 'petty cash', 'cash', 'cash_drawer', 'cash drawer')
      AND COALESCE(is_active, TRUE) = TRUE
    ORDER BY
        CASE WHEN LOWER(account_name) LIKE '%abu bakar%' OR LOWER(account_name) LIKE '%abt%' THEN 0 ELSE 1 END,
        created_at ASC
    LIMIT 1;

    IF v_petty_cash_id IS NULL THEN
        RAISE EXCEPTION 'Koi active Petty Cash account nahi mila! Pehle Cash Drawer setup karein.';
    END IF;

    -- Invoice header insert karein
    INSERT INTO public.sale_invoices (
        invoice_number,
        invoice_date,
        vehicle_number,
        petty_cash_account_id,
        remarks
    ) VALUES (
        TRIM(p_invoice_number),
        p_invoice_date,
        UPPER(TRIM(p_vehicle_number)),
        v_petty_cash_id,
        NULLIF(TRIM(p_remarks), '')
    )
    RETURNING id INTO v_invoice_id;

    -- Har customer line process karein
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_customer_id := (v_item->>'customer_id')::UUID;
        v_product_id  := (v_item->>'product_id')::UUID;
        v_qty         := COALESCE((v_item->>'quantity_bags')::NUMERIC, 0);
        v_rate        := COALESCE((v_item->>'rate_per_bag')::NUMERIC, 0);
        v_cash_paid   := COALESCE((v_item->>'cash_paid')::NUMERIC, 0);

        IF v_qty <= 0 OR v_rate < 0 THEN
            RAISE EXCEPTION 'Quantity 0 se zyada aur rate valid hona chahiye!';
        END IF;

        v_line_total  := ROUND(v_qty * v_rate, 2);
        v_net_balance := ROUND(v_line_total - v_cash_paid, 2);

        -- FR-5.1: Derived payment type
        IF v_cash_paid >= v_line_total AND v_line_total > 0 THEN
            v_payment_type := 'CASH';
        ELSIF v_cash_paid <= 0 THEN
            v_payment_type := 'CREDIT';
        ELSE
            v_payment_type := 'PARTIAL';
        END IF;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;

        -- Line insert karein
        INSERT INTO public.sale_invoice_items (
            sale_invoice_id,
            customer_id,
            product_id,
            quantity_bags,
            rate_per_bag,
            line_total,
            cash_paid,
            net_balance,
            payment_type
        ) VALUES (
            v_invoice_id,
            v_customer_id,
            v_product_id,
            v_qty,
            v_rate,
            v_line_total,
            v_cash_paid,
            v_net_balance,
            v_payment_type
        )
        RETURNING id INTO v_item_id;

        -- FR-5.2a: Customer Ledger mein Sale (Debit) post karein
        INSERT INTO public.customer_ledger (
            customer_id,
            sale_invoice_id,
            sale_item_id,
            transaction_date,
            invoice_number,
            vehicle_number,
            description,
            debit,
            credit
        ) VALUES (
            v_customer_id,
            v_invoice_id,
            v_item_id,
            p_invoice_date,
            TRIM(p_invoice_number),
            UPPER(TRIM(p_vehicle_number)),
            COALESCE(v_product_name, 'Cement') || ' - ' || v_qty || ' Bags @ ' || v_rate || ' (' || v_payment_type || ')',
            v_line_total,
            0
        );

        -- FR-5.2b: Agar cash_paid > 0 hai toh Customer Ledger mein Credit post karein
        IF v_cash_paid > 0 THEN
            INSERT INTO public.customer_ledger (
                customer_id,
                sale_invoice_id,
                sale_item_id,
                transaction_date,
                invoice_number,
                vehicle_number,
                description,
                debit,
                credit
            ) VALUES (
                v_customer_id,
                v_invoice_id,
                v_item_id,
                p_invoice_date,
                TRIM(p_invoice_number),
                UPPER(TRIM(p_vehicle_number)),
                'Cash Received on Inv #' || TRIM(p_invoice_number) || ' (' || UPPER(TRIM(p_vehicle_number)) || ')',
                0,
                v_cash_paid
            );
        END IF;

        -- FR-5.2c: Product stock_quantity (bags) reduce karein
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) - v_qty
        WHERE id = v_product_id;

        v_total_bags   := v_total_bags + v_qty;
        v_total_amount := v_total_amount + v_line_total;
        v_total_cash   := v_total_cash + v_cash_paid;
        v_total_net    := v_total_net + v_net_balance;
    END LOOP;

    -- Default Petty Cash mein total cash add karein
    IF v_total_cash > 0 THEN
        UPDATE public.accounts
        SET current_balance = COALESCE(current_balance, 0) + v_total_cash
        WHERE id = v_petty_cash_id;
    END IF;

    -- Invoice header totals update karein
    UPDATE public.sale_invoices
    SET
        total_bags = v_total_bags,
        total_amount = v_total_amount,
        total_cash_paid = v_total_cash,
        total_net_balance = v_total_net
    WHERE id = v_invoice_id;

    RETURN v_invoice_id;
END;
$$;

-- 6. RPC: Reverse Complete Sale Vehicle Invoice Atomically
CREATE OR REPLACE FUNCTION public.reverse_sale_vehicle_invoice(
    p_invoice_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_inv FROM public.sale_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale invoice nahi mili (ho sakta hai pehle hi reverse ho chuki ho)!';
    END IF;

    -- 1. Har item ke bags wapas product stock_quantity mein add karein
    FOR v_item IN SELECT * FROM public.sale_invoice_items WHERE sale_invoice_id = p_invoice_id
    LOOP
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) + COALESCE(v_item.quantity_bags, 0)
        WHERE id = v_item.product_id;
    END LOOP;

    -- 2. Petty Cash se total_cash_paid wapas minus karein
    IF COALESCE(v_inv.total_cash_paid, 0) > 0 AND v_inv.petty_cash_account_id IS NOT NULL THEN
        UPDATE public.accounts
        SET current_balance = COALESCE(current_balance, 0) - v_inv.total_cash_paid
        WHERE id = v_inv.petty_cash_account_id;
    END IF;

    -- 3. Customer ledger se is invoice ki saari entries delete karein
    DELETE FROM public.customer_ledger WHERE sale_invoice_id = p_invoice_id;

    -- 4. Invoice items aur header delete karein
    DELETE FROM public.sale_invoice_items WHERE sale_invoice_id = p_invoice_id;
    DELETE FROM public.sale_invoices WHERE id = p_invoice_id;

    RETURN TRUE;
END;
$$;