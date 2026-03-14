-- ============================================
-- AEGIS POS - COMPLETE Multi-Tenant Database Schema
-- Powered by socialbrand1980
-- ============================================
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy SEMUA isi file ini
-- 3. Paste dan klik "Run"
-- 4. Tunggu "Success. No rows returned"
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. BUSINESSES TABLE (Tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT DEFAULT 'general',
  status TEXT DEFAULT 'active',
  email TEXT,
  phone TEXT,
  pic_name TEXT,
  address TEXT,
  city TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. BUSINESS USERS (Owners/Staff)
-- ============================================
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- ============================================
-- 3. MEMBERS TABLE (Loyalty Program)
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  points_earned INTEGER NOT NULL DEFAULT 0,
  points_used INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL DEFAULT 0
);

-- ============================================
-- 7. SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, key)
);

-- ============================================
-- 8. MEMBER TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS member_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. FEATURE UPDATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS feature_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  version TEXT,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  email_recipient_count INTEGER NOT NULL DEFAULT 0,
  email_last_error TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_businesses_subdomain ON businesses(subdomain);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_business_users_user_id ON business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_member_id ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_business_id ON order_items(business_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_members_business_id ON members(business_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_settings_business_id ON settings(business_id);
CREATE INDEX IF NOT EXISTS idx_member_transactions_member_id ON member_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_feature_updates_status ON feature_updates(status);
CREATE INDEX IF NOT EXISTS idx_feature_updates_published_at ON feature_updates(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_feature_updates_featured ON feature_updates(featured);

-- ============================================
-- 11. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_updates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. RLS POLICIES - SELECT
-- ============================================
CREATE POLICY "Users can view their business" ON businesses FOR SELECT
USING (id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their business users" ON business_users FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can access their products" ON products FOR SELECT
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their orders" ON orders FOR SELECT
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their order items" ON order_items FOR SELECT
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their members" ON members FOR SELECT
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their settings" ON settings FOR SELECT
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their member transactions" ON member_transactions FOR SELECT
USING (member_id IN (SELECT id FROM members WHERE business_id IN (
  SELECT business_id FROM business_users WHERE user_id = auth.uid()
)));

CREATE POLICY "Anyone can view published feature updates" ON feature_updates FOR SELECT
USING (status = 'published');

-- ============================================
-- 13. RLS POLICIES - INSERT/UPDATE/DELETE
-- ============================================

-- Businesses
CREATE POLICY "Users can create businesses" ON businesses FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their business" ON businesses FOR UPDATE
USING (id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

-- Business Users
CREATE POLICY "Users can manage their business users" ON business_users FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Products
CREATE POLICY "Users can manage their products" ON products FOR ALL
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

-- Orders
CREATE POLICY "Users can manage their orders" ON orders FOR ALL
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

-- Order Items
CREATE POLICY "Users can manage their order items" ON order_items FOR ALL
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

-- Members
CREATE POLICY "Users can manage their members" ON members FOR ALL
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

-- Settings
CREATE POLICY "Users can manage their settings" ON settings FOR ALL
USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

-- Member Transactions
CREATE POLICY "Users can manage their member transactions" ON member_transactions FOR ALL
USING (member_id IN (SELECT id FROM members WHERE business_id IN (
  SELECT business_id FROM business_users WHERE user_id = auth.uid()
)))
WITH CHECK (member_id IN (SELECT id FROM members WHERE business_id IN (
  SELECT business_id FROM business_users WHERE user_id = auth.uid()
)));

-- ============================================
-- 14. HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_updates_updated_at BEFORE UPDATE ON feature_updates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 15. SAMPLE DATA (OPTIONAL - Remove if not needed)
-- ============================================
INSERT INTO businesses (business_name, subdomain, slug, industry, status, email, settings) VALUES
  ('Demo Store', 'demo', 'demo-store-abc123', 'general', 'demo', 'demo@aegispos.com',
   '{"receipt_header": "Demo Store", "receipt_footer": "Terima Kasih!", "paper_size": "58mm"}'::jsonb)
ON CONFLICT (subdomain) DO NOTHING;

-- ============================================
-- 16. ADDITIVE PAYMENT UPDATES
-- ============================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_path TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON orders(payment_provider);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_provider ON orders(payment_method, payment_provider);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS pic_name TEXT;

CREATE TABLE IF NOT EXISTS feature_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  version TEXT,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  email_recipient_count INTEGER NOT NULL DEFAULT 0,
  email_last_error TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_updates_status ON feature_updates(status);
CREATE INDEX IF NOT EXISTS idx_feature_updates_published_at ON feature_updates(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_feature_updates_featured ON feature_updates(featured);

ALTER TABLE feature_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feature_updates'
      AND policyname = 'Anyone can view published feature updates'
  ) THEN
    CREATE POLICY "Anyone can view published feature updates" ON feature_updates FOR SELECT
    USING (status = 'published');
  END IF;
END $$;

-- ============================================
-- END OF SCHEMA
-- Powered by socialbrand1980
-- ============================================
