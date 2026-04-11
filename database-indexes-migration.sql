-- ============================================
-- AEGIS POS - Composite Index Migration
-- ============================================
-- This migration adds composite indexes for frequently queried columns
-- Run this in Supabase SQL Editor to improve query performance
-- ============================================

-- Index for orders: most common query pattern (filter by business + sort by date)
CREATE INDEX IF NOT EXISTS idx_orders_business_created 
ON orders (business_id, created_at DESC);

-- Index for order_items: lookup by order_id (used in order detail queries)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items (order_id);

-- Index for order_items: filter by business + product
CREATE INDEX IF NOT EXISTS idx_order_items_business_product 
ON order_items (business_id, product_id);

-- Index for member_transactions: lookup by order_id (used in rollback queries)
CREATE INDEX IF NOT EXISTS idx_member_transactions_order_id 
ON member_transactions (order_id);

-- Index for member_transactions: filter by member + date
CREATE INDEX IF NOT EXISTS idx_member_transactions_member_created 
ON member_transactions (member_id, created_at DESC);

-- Index for business_users: fast auth resolution
CREATE INDEX IF NOT EXISTS idx_business_users_user_lookup 
ON business_users (user_id, business_id, role);

-- Index for members: search by phone within business
CREATE INDEX IF NOT EXISTS idx_members_business_phone 
ON members (business_id, phone);

-- Index for settings: fast key lookup within business
CREATE INDEX IF NOT EXISTS idx_settings_business_key 
ON settings (business_id, key);

-- Index for products: filter by business + category
CREATE INDEX IF NOT EXISTS idx_products_business_category 
ON products (business_id, category);

-- Index for products: low stock alerts
CREATE INDEX IF NOT EXISTS idx_products_business_stock 
ON products (business_id, stock);

-- ============================================
-- Verify indexes were created
-- ============================================
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- END OF MIGRATION
-- ============================================
