-- =============================================
-- DompetKu: Purchase Plan (Rencana Pembelian) Table
-- Run this SQL in Supabase SQL Editor
-- =============================================

-- Tabel purchase_plans: menyimpan rencana/pengingat pembelian barang
CREATE TABLE purchase_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_barang TEXT NOT NULL,
  perkiraan_harga BIGINT NOT NULL,
  tanggal_dicatat DATE NOT NULL DEFAULT CURRENT_DATE,
  urgensi TEXT NOT NULL DEFAULT 'NORMAL' CHECK (urgensi IN ('DARURAT', 'PENTING', 'NORMAL', 'KEINGINAN')),
  status TEXT NOT NULL DEFAULT 'DIRANCANG' CHECK (status IN ('DIRANCANG', 'DIPERTIMBANGKAN', 'DIBELI', 'DIBATALKAN', 'TIDAK_JADI_DIBUTUHKAN')),
  catatan TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE purchase_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own purchase plans"
  ON purchase_plans FOR ALL USING (auth.uid() = user_id);
