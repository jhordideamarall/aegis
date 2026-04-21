-- ========================================================
-- AEGIS POS - HPP & PROFIT MIGRATION
-- ========================================================
-- Deskripsi: Menambahkan kolom HPP dan cost_price untuk mendukung
-- fitur Net Profit dan Revenue di Dashboard.
-- ========================================================

-- 1. Tambah kolom 'hpp' di tabel 'products'
-- Ini untuk menyimpan harga modal produk saat ini.
ALTER TABLE products ADD COLUMN IF NOT EXISTS hpp INTEGER DEFAULT 0;

-- 2. Tambah kolom 'cost_price' di tabel 'order_items'
-- Ini untuk mencatat harga modal SAAT transaksi terjadi (snapshot),
-- agar laporan profit akurat meski harga modal di masa depan berubah.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price INTEGER DEFAULT 0;

-- 3. Backfill data untuk produk yang sudah ada
-- Mengisi HPP default (misal 70% dari harga jual) agar dashboard tidak kosong.
UPDATE products SET hpp = ROUND(price * 0.7) WHERE hpp = 0 OR hpp IS NULL;

-- 4. Backfill data untuk transaksi yang sudah ada
-- Menyinkronkan cost_price di order_items dengan hpp produk saat ini.
UPDATE order_items oi
SET cost_price = p.hpp
FROM products p
WHERE oi.product_id = p.id AND (oi.cost_price = 0 OR oi.cost_price IS NULL);

-- 5. Tambahkan Index untuk performa query laporan
CREATE INDEX IF NOT EXISTS idx_products_hpp ON products(hpp);
CREATE INDEX IF NOT EXISTS idx_order_items_cost_price ON order_items(cost_price);

-- ========================================================
-- SELESAI
-- Silakan jalankan script ini di Supabase SQL Editor
-- ========================================================
