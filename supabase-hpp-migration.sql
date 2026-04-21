-- Migration to add HPP and Cost Price tracking
-- 1. Add HPP (Harga Pokok Penjualan) to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS hpp INTEGER NOT NULL DEFAULT 0;

-- 2. Add cost_price to order_items table to snapshot cost at the time of sale
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price INTEGER NOT NULL DEFAULT 0;
