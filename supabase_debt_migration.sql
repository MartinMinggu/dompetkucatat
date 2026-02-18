  -- =============================================
  -- DompetKu: Debt/Receivable Tracking Tables
  -- Run this SQL in Supabase SQL Editor
  -- =============================================

  -- Tabel debts: menyimpan data utang/piutang
  CREATE TABLE debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('utang', 'piutang')),
    person_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    total_amount BIGINT NOT NULL,
    paid_amount BIGINT DEFAULT 0,
    due_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'settled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Tabel debt_payments: menyimpan histori pembayaran
  CREATE TABLE debt_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    note TEXT DEFAULT '',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- RLS (Row Level Security) policies
  ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can manage own debts"
    ON debts FOR ALL USING (auth.uid() = user_id);

  CREATE POLICY "Users can manage own debt payments"
    ON debt_payments FOR ALL USING (auth.uid() = user_id);
