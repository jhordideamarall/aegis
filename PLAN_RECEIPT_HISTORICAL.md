# Plan: Fix Historical Tax & Service on Receipts

## 🎯 Objective
Memastikan data Pajak (Tax) dan Biaya Layanan (Service) pada struk belanja bersifat permanen (historis). Saat ini, jika pengaturan pajak diubah di Settings, struk transaksi lama ikut berubah/hilang pajaknya. Kita akan mengubah arsitektur agar data ini disimpan ("disnapshotted") ke dalam tabel `orders` saat transaksi terjadi.

## 📂 Key Files
- `apps/web/src/app/(app)/pos/page.tsx`: Update logika checkout untuk mengirimkan data pajak/service.
- `apps/web/src/components/ReceiptPrinter.tsx`: Update tampilan struk agar mengutamakan data dari objek order daripada settings global.
- `supabase/schema.sql`: Menambahkan kolom baru ke tabel `orders`.

## 🛠️ Implementation Steps

### 1. Database Schema Update
Menambahkan kolom berikut ke tabel `orders` di Supabase:
- `tax_amount` (int)
- `tax_rate` (float)
- `service_amount` (int)
- `service_rate` (float)

### 2. POS Checkout Logic Update
Pada `apps/web/src/app/(app)/pos/page.tsx`, di dalam fungsi `handleCheckout`:
- Menghitung nilai `tax_amount` dan `service_amount` berdasarkan setting yang sedang aktif.
- Menyertakan kolom-kolom baru tersebut dalam payload `insert` ke tabel `orders`.

### 3. Receipt Printer UI Update
Pada `apps/web/src/components/ReceiptPrinter.tsx`:
- Mengubah kalkulasi `taxAmount`, `taxRate`, `serviceAmount`, dan `serviceRate`.
- Logika baru: `const taxAmount = order.tax_amount ?? (settings?.tax_enabled ? ... : 0)`.
- Dengan begini, transaksi baru akan selalu akurat mengikuti sejarahnya, sementara transaksi lama tetap memiliki *fallback* ke settings (agar tidak rusak).

## ✅ Verification
1. Lakukan transaksi dengan Pajak ON -> Cek struk (Pajak tampil).
2. Matikan Pajak di Settings -> Cek struk transaksi tadi (Pajak harus TETAP tampil).
3. Transaksi baru tanpa Pajak -> Cek struk (Pajak tidak tampil).
