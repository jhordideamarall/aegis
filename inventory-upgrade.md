# 📋 COMPREHENSIVE PLAN: Inventory Management System

## 1. Current State Analysis

### 1.1 Existing Schema

| Table | Columns | Status |
|-------|---------|--------|
| `products` | id, business_id, name, price, stock, category, hpp, image_url | ✅ Exist |
| `order_items` | id, order_id, product_id, qty, price, cost_price | ✅ Exist |
| `orders` | id, business_id, total, discount, tax_amount, service_amount | ✅ Exist |

### 1.2 Current Stock Display (Products Page)

```
Products Page → Stock Value = SUM(price × stock) // dari HARGA JUAL
```

| Product | Stock | Price | HPP | Stock Value (Jual) |
|---------|-------|-------|-----|---------------------|
| Kopi Susu | 44 | 25.000 | 6.000 | 1.100.000 |
| Kopi Americano | 116 | 20.000 | 4.000 | 2.320.000 |
| Kopi Tubruk | 49 | 18.000 | 3.000 | 882.000 |

---

## 2. Problem Definition

| # | Problem | Impact |
|---|---------|--------|
| 1 | HPP harus input manual | Tidak akurat, perlu update berkala |
| 2 | Tidak ada tracking bahan baku | Sulit tau bahan yang tersedia |
| 3 | Stock bahan tidak auto-reduce saat order | Stok bisa negatif |
| 4 | Tidak ada warning stock rendah | Kehabisan bahan tanpa tanda |
| 5 | Tidak ada sistem supplier | sulit compare harga bahan |

---

## 3. New Feature: Dual Mode System

### 3.1 Mode Definition

| Mode | Description | Example |
|-----|-------------|---------|
| **Internal (Default)** | Inventory untuk sendiri | Kopi Manjur punya bahan sendiri |
| **Supplier** | Kita jadi supplier untuk customer lain | Kita supply cup/gula ke bisnis lain |

### 3.2 User bisa pilih mode di settings

```
Settings → Inventory Mode:
├── Internal (default) - Inventory untuk operasional bisnis sendiri
└── Supplier - Saya juga menyediakan bahan untuk customer lain
```

---

## 4. Proposed Database Schema

### 4.1 Tables Structure

```sql
-- =====================================================
-- Table: suppliers (Supplier per Bisnis)
-- =====================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "CV Maju Jaya", "PT Berkah Food"
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: raw_materials (Bahan Baku)
-- =====================================================
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Kopi Beans", "Susu", "Cup", dll
  category TEXT DEFAULT 'consumable' CHECK (category IN ('consumable', 'packaging', 'other')),
  unit TEXT DEFAULT 'pcs' CHECK (unit IN ('pcs', 'gram', 'ml', 'kg', 'liter')),
  cost_per_unit INTEGER DEFAULT 0, -- contoh: 5000 per 1000ml
  stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0, -- alert kalau di bawah ini
  supplier_id UUID REFERENCES suppliers(id), -- Primary supplier
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: supplier_prices (Harga per Supplier per Bahan)
-- =====================================================
CREATE TABLE supplier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  cost_per_unit INTEGER DEFAULT 0,
  min_order_qty INTEGER DEFAULT 1,
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, material_id)
);

-- =====================================================
-- Table: product_materials (Mapping Produk ke Bahan)
-- =====================================================
CREATE TABLE product_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  qty_needed NUMERIC NOT NULL DEFAULT 1, -- contoh: 20g kopi, 100ml susu
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, material_id)
);

-- =====================================================
-- Table: customer_requests (Request bahan ke kita - untuk Supplier Mode)
-- =====================================================
CREATE TABLE customer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, -- yang minta
  supplying_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, -- yang supply (kita)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: customer_request_items (Item yang di request)
-- =====================================================
CREATE TABLE customer_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES customer_requests(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  qty_needed NUMERIC NOT NULL DEFAULT 1,
  unit_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Update Products Table

```sql
ALTER TABLE products 
  ADD COLUMN auto_calculated_hpp INTEGER,
  ADD COLUMN is_menu BOOLEAN DEFAULT true;
```

---

## 5. User Experience Design

### 5.1 Settings: Inventory Mode

```
┌─────────────────────────────────────────┐
│ INVENTORY SETTINGS                      │
├─────────────────────────────────────────┤
│ Mode: [Internal ●] [Supplier ○]       │
├─────────────────────────────────────────┤
│                                         │
│ ● Internal                            │
│   Inventory untuk operasional bisnismu  │
│   sendiri aja.                          │
│                                         │
│ ○ Supplier                             │
│   Saya juga menyediakan bahan untuk     │
│   customer lain.                       │
└─────────────────────────────────────────┘
```

### 5.2 Tab Structure (Products Page) - Tab "Bahan Baku"

```
┌────────────────────────────────────────────────────────────────┐
│ PRODUCTS                           [+ Tambah Produk]  │
├────────────────────────────────────────────────────────────────┤
│ [Menu] [Bahan Baku]                                     │
├────────────────────────────────────────────────────────────────┤
│                                                         │
│ Tab: Bahan Baku                                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Name          │ Stock  │ Unit  │ Cost      │ [Edit] │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ Kopi Beans   │ 5000g │ gram  │ Rp 150K  │ [Edit] │   │
│ │ Susu UHT     │ 10L   │ ml    │ Rp 50K   │ [Edit] │   │
│ │ Cup          │ 500pcs │ pcs   │ Rp 1.5K  │ [Edit] │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                         │
│ [+ Tambah Bahan] [+ Tambah Supplier]                  │
└────────────────────────────────────────────────────────────────┘
```

### 5.3 Modal: Set Bahan (Product → Materials Mapping)

```
┌────────────────────────────────────────────────────────────────┐
│ Atur Bahan: Kopi Americano                            [X]  │
├────────────────────────────────────────────────────────────────┤
│ current HPP: Rp 4.000 → auto-calculated: Rp 3.500           │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐     │
│ │ Bahan           │ Needed   │ Unit    │ Cost/Unit     │     │
│ ├────────────────────────────────────────────────────────┤     │
│ │ ☑ Kopi Beans     │ 20       │ gram    │ Rp 150.000/kg  │     │
│ │ ☑ Susu UHT      │ 100      │ ml      │ Rp 50.000/L    │     │
│ │ ☑ Cup           │ 1        │ pcs     │ Rp 1.500/pcs  │     │
│ │ ☐ Gula          │ 10       │ gram    │ Rp 25.000/kg  │     │
│ └────────────────────────────────────────────────────────┘     │
│ [+ Tambah Bahan]                                          │
├────────────────────────────────────────────────────────────────┤
│ [Cancel]                                       [Simpan]    │
└────────────────────────────────────────────────────────────────┘
```

### 5.4 Tab: Suppliers (Baru untuk Supplier Mode)

```
┌──────────────────────────────────────────────┐
│ SUPPLIERS                           [+ Tambah] │
├──────��─��─────────────────────────────────────┤
│ ┌────────────────────────────────────────┐  │
│ │ Name        │ Contact    │ Phone │ Active│  │
│ ├────────────────────────────────────────┤  │
│ │ CV Maju    │ Budi      │ 0812  │ ✓    │  │
│ │ PT Berkah │ Ahmad    │ 0813  │ ✓    │  │
│ │ (Kita)   │ -        │ -     │ ✓    │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 5.5 Request System (Untuk Supplier Mode)

```
┌──────────────────────────────────────────────┐
│ MY SUPPLIER REQUESTS                         │
├──────────────────────────────────────────────┤
│ Status: All [Pending] [Approved] [Rejected] │
│                                             │
│ ┌────────────────────────────────────────┐  │
│ │ Bisnis      │ Status    │ Date  │ Action│  │
│ ├────────────────────────────────────────┤  │
│ │ Kopi Manjur │ Pending │ Today │ [Approve]│  │
│ │ Toko Roti  │ Approved│ Today │ [View]  │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 6. Stock Value Display

### 6.1 Dua Jenis Nilai

| Metric | Formula | Description |
|--------|---------|-------------|
| **Nilai Jual** | SUM(price × stock) | Kalau semua products laku |
| **Nilai Modal** | SUM(hpp × stock) | Modal yang ditanam |

### 6.2 Proposed Display

```
┌─────────────────────────────────┐
│ STOCK VALUE                      │
├─────────────────────────────────┤
│ Nilai Jual:   Rp 4.302.000      │ ← dari price
│ Nilai Modal:  Rp 875.000       │ ← dari hpp
│─────────────────────────────────│
│ Low Stock:   0 items ⚠️          │
└─────────────────────────────────┘
```

---

## 7. Implementation Phases

### Phase 1: Database & Tables (Priority: HIGH)

| Step | Action |
|------|--------|
| 1.1 | Create `suppliers` table |
| 1.2 | Create `raw_materials` table |
| 1.3 | Create `supplier_prices` table |
| 1.4 | Create `product_materials` table |
| 1.5 | Add columns to `products` (auto_calculated_hpp, is_menu) |
| 1.6 | Add RLS policies |

### Phase 2: Supplier Management API (Priority: HIGH)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/suppliers` | GET, POST | List + Create suppliers |
| `/api/suppliers/[id]` | PUT, DELETE | Update supplier |
| `/api/materials` | GET, POST | CRUD raw materials |
| `/api/materials/[id]` | PUT | Update stock/material |
| `/api/product-materials` | GET, POST | Get/Add product→material mapping |

### Phase 3: Order Integration (Priority: HIGH)

| Step | Action |
|------|--------|
| 3.1 | On order created: fetch product materials |
| 3.2 | Validate stock availability |
| 3.3 | Decrement raw materials stock |
| 3.4 | Recalculate product auto_calculated_hpp |

### Phase 4: Supplier Mode - Requests (Priority: MEDIUM - Future)

| Step | Action |
|------|--------|
| 4.1 | Create `customer_requests` table (if not phase 1) |
| 4.2 | API for request management |
| 4.3 | Request approval UI |
| 4.4 | Privilege system: who can request to whom |

### Phase 5: Frontend

| Step | Action |
|------|--------|
| 5.1 | Add Tab "Bahan Baku" di products page |
| 5.2 | Create "Atur Bahan" modal |
| 5.3 | Add "Suppliers" page |
| 5.4 | Update Stock Value display |
| 5.5 | Add Settings: Inventory Mode selector |

---

## 8. Implementation Decisions (Confirmed)

| # | Item | Decision |
|---|------|----------|
| 1 | Tab name | Bahan Baku |
| 2 | Button name | Atur Bahan |
| 3 | Stock Value | Tampilkan keduanya (Jual + Modal) |
| 4 | Auto-decrement | Saat create order |
| 5 | Suppliers | Per-bisnis (multi-tenant) |
| 6 | Kita sebagai supplier | Optional via settings |
| 7 | Request System | Later (Phase 4) |

---

## 9. Benefits & User Experience

| Benefit | User Experience |
|---------|-----------------|
| ✅ Auto-HPP | Tidak perlu input manual - otomatis dari bahan |
| ✅ Stock Alert | Tahu bahan hampir habis via min_stock_level |
| ✅ Auto-Decrement | Stok bahan otomatis berkurang saat order |
| ✅ Transparency | Tau bahan apa saja per produk |
| ✅ Flexible | Semua jenis F&B bisa pakai |
| ✅ Supplier Track | Bisa compare harga antar supplier |
| ✅ Multi-role | Jadi bisnispun bisa jadi supplier |

---

## 10. Example Use Cases

### 10.1 Kopi Shop (Internal)

```
Product: Kopi Americano (Rp 18.000)

Materials:
- Kopi Beans: 20g × Rp 150.000/kg = Rp 3.000
- Susu UHT: 100ml × Rp 50.000/L = Rp 5.000
- Cup: 1pcs × Rp 1.500 = Rp 1.500
- Gula: 10g × Rp 25.000/kg = Rp 250
─────────────────────────────────
Total HPP: Rp 9.750 (auto-calculated)
```

### 10.2 Supplier Mode (Kita sebagai Supplier)

```
Kita punya bahan:
- Cup: 10.000 pcs @ Rp 1.000
- Gula: 50 kg @ Rp 20.000

Customer (Toko Roti Lezat) request:
- 500 cup + 10 kg gula
- Kita approve
- Kirim barang
```

---

## 11. Migration SQL Draft

```sql
-- =====================================================
-- PHASE 1: Create Tables
-- =====================================================

-- Table: suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: raw_materials
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'consumable' CHECK (category IN ('consumable', 'packaging', 'other')),
  unit TEXT DEFAULT 'pcs' CHECK (unit IN ('pcs', 'gram', 'ml', 'kg', 'liter')),
  cost_per_unit INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: supplier_prices
CREATE TABLE supplier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  cost_per_unit INTEGER DEFAULT 0,
  min_order_qty INTEGER DEFAULT 1,
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, material_id)
);

-- Table: product_materials
CREATE TABLE product_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  qty_needed NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, material_id)
);

-- Table: customer_requests (for Supplier Mode - Future)
CREATE TABLE customer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplying_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: customer_request_items
CREATE TABLE customer_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES customer_requests(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  qty_needed NUMERIC NOT NULL DEFAULT 1,
  unit_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to products
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS auto_calculated_hpp INTEGER,
  ADD COLUMN IF NOT EXISTS is_menu BOOLEAN DEFAULT true;

-- =====================================================
-- PHASE 2: RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
CREATE POLICY "Users can access their suppliers" ON suppliers
  FOR ALL USING (business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ));

-- Raw materials policies
CREATE POLICY "Users can access raw materials" ON raw_materials
  FOR ALL USING (business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ));

-- Supplier prices policies
CREATE POLICY "Users can access supplier prices" ON supplier_prices
  FOR ALL USING (business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ));

-- Product materials policies
CREATE POLICY "Users can access product materials" ON product_materials
  FOR ALL USING (business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ));

-- Customer requests policies
CREATE POLICY "Users can access their requests" ON customer_requests
  FOR ALL USING (
    requester_business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
    OR supplying_business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
  );

-- Customer request items policies
CREATE POLICY "Users can access request items" ON customer_request_items
  FOR ALL USING (request_id IN (
    SELECT id FROM customer_requests WHERE 
    requester_business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
    OR supplying_business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
  ));

-- Update products policies for new columns
CREATE POLICY "Users can update products" ON products
  FOR UPDATE USING (business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ));
```

---

## 12. Future Features (Phase 4+)

| Feature | Description |
|---------|-------------|
| Customer Request System | Customer bisa request bahan ke kita (supplier) |
| Privilege System | Siapa yang boleh request ke siapa |
| Order Tracking | Tracking pengiriman ke customer |
| Invoice System | Generate invoice untuk supplier orders |
| Payment Integration | Payment untuk supplier orders |
| Analytics | Supplier sales reports |

---

*Document Version: 2.0*
*Updated: 2026-04-30*
*Status: Ready for Implementation*

---

## 📝 Notes untuk Developer

1. **Start with Phase 1** - Database tables dan basic inventory
2. **Phase 2-3** - API dan Order integration (核心)
3. **Phase 4** - Supplier Mode requests (bisa later)
4. **Always maintain multi-tenant** - bisnis_id di semua table

Happy Building! 🚀