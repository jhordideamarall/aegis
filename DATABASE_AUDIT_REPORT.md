# Laporan Audit Keseluruhan Database & Migrasi Supabase (AEGIS POS)

Berdasarkan analisa terhadap skema database (`dump_schema.sql` dan `supabase/schema.sql`) serta common pitfalls pada migrasi Supabase ke region baru (Supabase SG), saya menemukan beberapa penyebab utama mengapa codebase dan business logic menjadi berantakan.

## 1. Penyebab Utama "Business Logic Berantakan" Pasca Migrasi (Auth Mismatch)
Ketika melakukan migrasi project Supabase (misal dari region lain ke SG), seringkali *hanya* skema `public` yang di-dump dan di-restore. 
- **Masalah:** Tabel `public.business_users` memiliki relasi `user_id UUID REFERENCES auth.users(id)`. Pada project Supabase SG yang baru, tabel `auth.users` kosong atau UUID-nya berbeda karena user harus mendaftar ulang, atau karena tabel `auth` belum ter-migrasi.
- **Dampak:** Karena semua Row Level Security (RLS) bergantung pada `user_id = auth.uid()`, dan UID di `business_users` tidak cocok dengan user yang login, maka **semua query ke database akan mengembalikan 0 baris (kosong)**. Aplikasi seolah-olah "rusak" atau berantakan, karena data bisnis, produk, dan order tidak bisa diakses sama sekali.
- **Solusi:** Pastikan tabel `auth.users` dan `auth.identities` ikut dimigrasikan dengan UUID yang sama, atau jalankan script untuk menyinkronkan (re-link) user yang baru mendaftar ke `business_users` yang sudah ada.

## 2. Isu Performa & Keamanan RLS (Row Level Security)
Skema saat ini menggunakan pola RLS yang sangat lambat (Anti-Pattern Supabase).

**Kondisi Saat Ini:**
```sql
CREATE POLICY "Users can access their products" ON products 
FOR SELECT USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));
```
- **Masalah:** Fungsi `auth.uid()` dipanggil secara *per-row* (setiap baris). Jika ada 10,000 produk, subquery ini akan dieksekusi 10,000 kali.
- **Solusi (Best Practice Supabase):** Bungkus `auth.uid()` dalam `(select auth.uid())` agar di-cache oleh Postgres, dan gunakan `EXISTS`.
```sql
CREATE POLICY "Users can access their products" ON products 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM business_users 
    WHERE business_users.business_id = products.business_id 
    AND business_users.user_id = (select auth.uid())
  )
);
```
*(Atau lebih baik lagi, gunakan Helper Function dengan `SECURITY DEFINER` untuk RLS multi-tenant).*

## 3. Kekurangan pada Struktur RLS "INSERT" & "UPDATE"
Pada kebijakan INSERT/UPDATE produk, order, dll, kondisinya menggunakan `IN (SELECT ...)`.
- **Masalah:** Kueri INSERT `WITH CHECK` yang panjang ini sangat rentan menyebabkan lambatnya transaksi kasir (Orders/Order Items). 
- Selain itu, di `businesses`, role user saat ini adalah `DEFAULT 'owner'`. Belum ada RLS yang membedakan izin antara 'owner' dan 'staff' (semua auth user di sebuah bisnis dianggap setara).

## 4. Hilangnya Referensi Transaksi Jika Order Dihapus
Di tabel `member_transactions`:
```sql
order_id UUID REFERENCES orders(id) ON DELETE SET NULL
```
- **Masalah:** Jika order dibatalkan/dihapus (cascade dari bisnis), transaksi poin loyalty akan menjadi "yatim piatu" (NULL) tanpa tahu order mana yang memicu poin tersebut. Ini akan menyebabkan audit poin/loyalty member tidak balance.
- **Solusi:** Sebaiknya tidak menggunakan `ON DELETE SET NULL` pada riwayat poin, melainkan `ON DELETE RESTRICT` (mencegah order dihapus jika punya poin), atau menyimpan soft-delete/status (misal: `status = 'cancelled'`).

## 5. Security Path pada Helper Function
- Trigger function `update_updated_at_column()` sebaiknya diberi parameter penutup untuk faktor keamanan.
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = '' -- Best practice Supabase
AS $$ ... $$;
```

---

## Rekomendasi Langkah Perbaikan (Action Plan)

1. **Perbaikan Data Migrasi (Urgent):** Cek data di tabel `auth.users` (lewat dashboard Supabase SG). Apakah UUID user di sana sama dengan UUID `user_id` di tabel `business_users`? Jika berbeda, kita harus membuat script SQL untuk melakukan map/update UUID lama ke UUID baru berdasarkan alamat email.
2. **Refactor RLS Policies:** Tulis ulang semua RLS di `schema.sql` menggunakan `(select auth.uid())` dan klausa `EXISTS`.
3. **Penerapan Custom Claims (Opsional tapi Kuat):** Untuk aplikasi POS (Point of Sales) multi-tenant, sangat disarankan menggunakan **JWT Custom Claims** (menyimpan `business_id` dan `role` ke dalam JWT saat user login). Dengan JWT claims, RLS tidak perlu melakukan `SELECT` ke tabel `business_users` sama sekali, performa baca/tulis akan 100x lebih cepat.

Jika Anda ingin saya langsung membuatkan **SQL Migration/Fix** untuk mengoptimalkan performa RLS ini dan mengecek data `business_users`, mohon konfirmasi!