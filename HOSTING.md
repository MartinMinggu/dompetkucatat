# 🚀 Panduan Hosting Gratis — DompetKu

## 1️⃣ Setup Supabase (Database Gratis)

### Buat Akun Supabase
1. Buka [https://supabase.com](https://supabase.com)
2. Klik **Start your project** → login dengan GitHub
3. Klik **New Project**
   - Nama: `dompetku`
   - Password database: (buat password kuat, simpan)
   - Region: **Southeast Asia (Singapore)**
4. Tunggu project selesai dibuat (~2 menit)

### Buat Tabel Database
1. Di dashboard Supabase, buka **SQL Editor**
2. Klik **New query**
3. Paste SQL berikut lalu klik **Run**:

```sql
-- Tabel Kategori
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  type TEXT CHECK (type IN ('income', 'expense', 'both')) DEFAULT 'both',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel Transaksi
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  amount BIGINT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own categories"
  ON categories FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own transactions"
  ON transactions FOR ALL USING (auth.uid() = user_id);
```

### Ambil API Keys
1. Buka **Settings** → **API**
2. Copy nilai berikut:
   - **Project URL** → contoh: `https://abcdefg.supabase.co`
   - **anon public key** → string panjang yang dimulai `eyJ...`

### Masukkan API Keys ke Kode
1. Buka file `js/supabase-client.js`
2. Ganti baris 3 dan 4:
```javascript
const SUPABASE_URL = 'https://abcdefg.supabase.co';     // ganti dengan URL-mu
const SUPABASE_ANON_KEY = 'eyJhbGciOiJI...';            // ganti dengan anon key-mu
```

---

## 2️⃣ Hosting di GitHub Pages (Gratis)

### Buat Repository
1. Buka [https://github.com](https://github.com) → login
2. Klik **+** → **New repository**
   - Nama: `dompetku`
   - Visibility: **Public** (wajib untuk GitHub Pages gratis)
   - ❌ Jangan centang "Initialize with README"
3. Klik **Create repository**

### Upload Kode
Buka terminal di folder project, jalankan:
```bash
git init
git add .
git commit -m "Initial commit - DompetKu"
git branch -M main
git remote add origin https://github.com/USERNAME/dompetku.git
git push -u origin main
```
> Ganti `USERNAME` dengan username GitHub-mu.

### Aktifkan GitHub Pages
1. Di repository GitHub, buka **Settings** → **Pages**
2. Di **Source**, pilih **Deploy from a branch**
3. Branch: **main**, Folder: **/ (root)**
4. Klik **Save**
5. Tunggu 1-2 menit, lalu akses: `https://USERNAME.github.io/dompetku/`

---

## 3️⃣ Install PWA di HP

1. Buka URL app di browser HP (Chrome / Safari)
2. **Android**: Tap menu ⋮ → **"Add to Home screen"**
3. **iPhone**: Tap share icon → **"Add to Home Screen"**
4. App akan muncul di home screen seperti app native!

---

## 📝 Catatan Penting

- **Gratis selamanya**: Supabase free tier (500MB) + GitHub Pages = Rp0
- **Keamanan**: RLS (Row Level Security) memastikan data antar user terisolasi
- **API Key di frontend aman**: Karena RLS aktif, key hanya bisa mengakses data user yang login
- **Backup**: Supabase otomatis backup data setiap hari
- **Custom domain**: Bisa ditambahkan di GitHub Pages settings (opsional)
