-- =============================================
-- DompetKu: Stock/Trading Portfolio Tables
-- Run this SQL in Supabase SQL Editor
-- =============================================

-- Tabel stock_transactions: menyimpan data deposit, withdraw, profit, loss saham/trading
CREATE TABLE stock_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'profit', 'loss')),
  amount BIGINT NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own stock transactions"
  ON stock_transactions FOR ALL USING (auth.uid() = user_id);
