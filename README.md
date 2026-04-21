# 🚀 AEGIS POS - Complete Multi-Tenant Point of Sale System

**POS System Gratis untuk Bisnis Indonesia** 🇮🇩  
**Powered by socialbrand1980**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.3-blue?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Complete Features](#-complete-features)
- [User Guide](#-user-guide)
- [Technical Architecture](#-technical-architecture)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Development](#-development)
- [Support](#-support)

---

## 🎯 Overview

**AEGIS POS** adalah sistem Point of Sale (POS) lengkap yang dirancang khusus untuk UMKM Indonesia. Dengan arsitektur multi-tenant modern, sistem ini memungkinkan berbagai bisnis beroperasi secara independen dalam satu infrastruktur yang scalable.

### ✨ Key Highlights

| Feature | Description |
|---------|-------------|
| 🆓 **100% Free** | Gratis selamanya, tanpa biaya langganan atau transaksi tersembunyi |
| ⚡ **2-Minute Setup** | Wizard 3 langkah, langsung siap jualan |
| 🇮🇩 **Indonesia-First** | Bahasa Indonesia, format Rupiah, metode pembayaran lokal |
| ⭐ **Loyalty Program** | Sistem points lengkap built-in |
| 🖨️ **Thermal Printer** | Support printer thermal 58mm & 80mm |
| 📊 **Real-time Analytics** | Dashboard live dengan Supabase Realtime |
| 📱 **Mobile-First** | Responsive di laptop, tablet, dan HP |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)

### Step 1: Setup Database

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project kamu (atau buat baru)
3. Buka **SQL Editor** di sidebar kiri
4. Klik **"New Query"**
5. **Copy SEMUA isi file** `database-schema.sql`
6. **Paste** di SQL Editor
7. Klik **"Run"** atau tekan `Ctrl+Enter`
8. ✅ Tunggu sampai muncul *"Success. No rows returned"*

### Step 2: Configure Environment Variables

File `.env.local` sudah terisi dengan Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

> ⚠️ **Important:** Ganti dengan credentials dari Supabase project kamu!

### Step 3: Install & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Buka browser: **http://localhost:3000**

### Step 4: Create Your Business

1. Klik **"Get Started"** di homepage
2. Isi **3 langkah setup wizard**:
   - **Business Info** - Nama bisnis, industri, kontak
   - **Owner Account** - Email & password untuk login
   - **Store Settings** - Custom receipt header/footer
3. ✅ Auto-login dan redirect ke Dashboard
4. Mulai **Add Products** dan **Start Selling**!

---

## ✨ Complete Features

### 📊 Dashboard Analytics

**Real-time business intelligence dengan period-over-period comparisons:**

- **Key Metrics**
  - Total Sales (dengan trend percentage)
  - Total Orders (dengan growth rate)
  - Total Products count
  - Total Members count
  - New Members (current vs previous period)

- **Visualizations**
  - 📈 Sales Trend Chart (hourly/daily breakdown)
  - 💳 Payment Methods distribution (progress bars)
  - 🏆 Top 5 Products by revenue
  - 👑 Top 5 Members by spending
  - 🕐 Recent Sales (last 10 transactions)

- **Date Range Filters**
  - Today
  - This Week (Sunday to Saturday)
  - This Month (1st to last day)
  - Custom Range (date pickers)

- **Real-time Updates**
  - Auto-refresh via Supabase Realtime
  - Live updates on orders, members, products changes

---

### 🛒 Point of Sale (POS)

**Complete checkout interface optimized for speed:**

- **Product Interface**
  - Responsive grid layout (2-5 columns)
  - Real-time search by name
  - Category filter tabs
  - Stock indicators (In Stock / Low Stock / Out of Stock)
  - Product cards: name, category, price, stock level
  - Touch-friendly with scale animation

- **Shopping Cart**
  - Sticky sidebar (desktop) / Bottom sheet (mobile)
  - Quantity controls (+/- buttons)
  - Remove individual items
  - Clear all option
  - Real-time total calculation
  - Empty state with CTA

- **Member System**
  - Member search modal
  - Quick add member from POS
  - Display: name, phone, available points
  - Points earning estimation (1 point per Rp 10,000)

- **Payment Flow**
  - **Payment Methods:**
    - 💵 Cash
    - 💳 Debit Card
    - 💳 Credit Card
    - 📱 GoPay (e-wallet)
    - 📱 OVO (e-wallet)
    - 📱 DANA (e-wallet)

  - **Points Redemption:**
    - Minimum 20 points to redeem
    - 1 point = Rp 100 discount
    - Dropdown selector for redemption amount
    - Real-time final total calculation

  - **Tax & Service Charges:**
    - Configurable tax percentage
    - Configurable service percentage
    - Applied after points discount
    - Shown in itemized breakdown

- **Checkout Process**
  1. Add products to cart
  2. Select member (optional)
  3. Click "Checkout"
  4. Payment modal opens with breakdown
  5. Select payment method
  6. Choose points redemption (if applicable)
  7. Confirm payment
  8. Success notification with receipt print option
  9. Auto-redirect to orders with receipt print

---

### 📦 Products Management

**Complete inventory management system:**

- **Product List**
  - Pagination (20 items per page)
  - Search by product name
  - Category filter dropdown
  - Mobile: Card layout
  - Desktop: Table layout

- **Product Information**
  - Product Name + ID
  - Category (color badge)
  - Price (formatted IDR)
  - Stock count
  - Stock Status indicators:
    - 🟢 Green: Stock > 10
    - 🟡 Yellow: 0 < Stock ≤ 10 (Low Stock)
    - 🔴 Red: Stock = 0 (Out of Stock)
  - Actions (Edit / Delete)

- **Product Statistics**
  - Total Products count
  - In Stock count (stock > 10)
  - Low/Out of Stock count (stock ≤ 10)

- **Add/Edit Product Modal**
  - Product Name (required)
  - Category (required, free text)
  - Price (IDR, auto-formatted with thousand separators)
  - Stock quantity (required)
  - Quick adjust buttons (-10 / +10)
  - Validation for positive numbers

- **Operations**
  - ✅ Create product
  - ✅ Edit product (pre-populated form)
  - ✅ Delete product (with confirmation)
  - ✅ Automatic stock deduction on order

---

### 📋 Orders Management

**Comprehensive order history and management:**

- **Order List**
  - Pagination (20 items per page)
  - **Search by:** Order ID, Payment Method, Customer Name/Phone
  - **Date Range Filters:**
    - All
    - Today
    - This Week
    - Custom Range

- **Payment Method Filter**
  - All Payment
  - Cash
  - Debit
  - Credit
  - GoPay
  - OVO
  - DANA

- **Order Statistics**
  - Total Orders count
  - Total Revenue (sum of all orders)
  - Average Order Value

- **Order Table Columns**
  - Order ID (short UUID, monospace font)
  - Date & Time (formatted)
  - Customer (Member name + phone, or "General")
  - Items count
  - Payment Method (color-coded badge)
  - Total Amount
  - Actions (View button)

- **Order Detail View**
  - Full order information
  - All order items with quantity and price
  - Customer details
  - Points earned/redeemed
  - Discount applied
  - Payment method

- **Receipt Printing**
  - Triggered from order detail view
  - Auto-triggered after POS checkout (`?print=true&id=xxx`)
  - ReceiptPrinter component with:
    - Printer selection
    - Paper size selection (58mm / 80mm)
    - Live preview
    - Browser print dialog integration
    - Custom print CSS for thermal printers

---

### ⭐ Members Loyalty Program

**Built-in customer loyalty management:**

- **Member List**
  - Pagination (20 items per page)
  - Search by name or phone
  - Mobile: Card layout
  - Desktop: Table layout

- **Member Information**
  - Member Name + ID
  - Contact (phone, email)
  - Points (with star icon)
  - Total Purchases (IDR)
  - Join Date
  - Actions (Edit / Delete)

- **Member Statistics**
  - Total Members count
  - Total Points Issued (sum of all points)
  - Total Member Revenue (sum of total_purchases)

- **Points System**
  - **Earn:** 1 point per Rp 10,000 spent
  - **Redeem:** Minimum 20 points
  - **Value:** 1 point = Rp 100 discount
  - **Tracking:** Points tracked in `member_transactions` table
  - **Transaction Types:** 'earn' / 'redeem'

- **Add/Edit Member Modal**
  - Name (required)
  - Phone (required, Indonesian format: 08xxxxxxxxxx)
  - Email (optional)
  - Points (editable for existing members)
  - Total Purchases (read-only, auto-calculated)

- **Operations**
  - ✅ Create member
  - ✅ Edit member (including manual points adjustment)
  - ✅ Delete member (with confirmation)
  - ✅ Phone uniqueness validation per business

---

### ⚙️ Settings

**Business configuration and customization:**

- **Business Information (Read-only)**
  - Business Name
  - Email
  - Phone
  - Industry
  - Note: Contact support to update

- **Receipt Settings**
  - **Receipt Header:** Business name displayed at top
  - **Receipt Footer:** Thank you message (supports `\n` for line breaks)
  - **Paper Size:** 58mm (standard) or 80mm (wide)
    - Visual selector with icons
    - Affects print layout and preview

- **Tax & Service Configuration**
  - **Tax:**
    - Enable/disable toggle
    - Percentage input (e.g., 10)
  - **Service:**
    - Enable/disable toggle
    - Percentage input (e.g., 5)
  - Applied to subtotal (after points discount)

- **Live Receipt Preview**
  - Real-time preview as settings change
  - Shows sample transaction
  - Displays header, items, subtotal, tax, service, total, footer
  - Accurate width simulation (58mm or 80mm)
  - Monospace font for thermal printer simulation

- **Save Functionality**
  - Save button with loading state
  - Success notification (auto-dismiss after 3 seconds)
  - Error handling with alerts

---

## 📖 User Guide

### New User Onboarding Flow

```
┌─────────────────┐
│  Visit Homepage │
│  (localhost:3000)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Click "Get     │
│  Started"       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Setup Wizard   │
│  (3 steps, ~2min)│
│  1. Business    │
│  2. Account     │
│  3. Settings    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto-login &   │
│  Redirect to    │
│  Dashboard      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Add Products   │
│  (Products page)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Start Selling  │
│  (POS page)     │
└─────────────────┘
```

### Daily Operations Flow (Cashier)

```
┌─────────────────┐
│  Login          │
│  (/login)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Dashboard      │
│  - View stats   │
│  - Check trends │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  POS Interface  │
│  1. Select      │
│     products    │
│  2. Add to cart │
│  3. Select      │
│     member      │
│  4. Checkout    │
│  5. Payment     │
│  6. Print       │
│     receipt     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orders Page    │
│  - View history │
│  - Reprint      │
│    receipts     │
└─────────────────┘
```

### Member Loyalty Flow

```
┌─────────────────┐
│  Customer       │
│  Makes Purchase │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cashier        │
│  Selects Member │
│  (or adds new)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Points Earned  │
│  (1 pt / 10k)   │
│  Auto-added to  │
│  member account │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Future Visit:  │
│  Redeem Points  │
│  (min 20 pts =  │
│   Rp 2,000)     │
└─────────────────┘
```

### Inventory Management Flow

```
┌─────────────────┐
│  Products Page  │
│  - View stock   │
│  - Low stock    │
│    alerts       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Edit Product   │
│  - Adjust stock │
│  - Update price │
│  - Change info  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  POS Checkout   │
│  Auto-deducts   │
│  stock on sale  │
└─────────────────┘
```

---

## 🏗️ Technical Architecture

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | React framework, App Router, API routes |
| **React** | 19.2.3 | UI library |
| **TypeScript** | ^5 | Type safety |
| **Tailwind CSS** | ^4 | Utility-first styling |
| **React Feather** | ^2.0.10 | Icon library |
| **Babel React Compiler** | 1.0.0 | Automatic memoization |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | RESTful API endpoints |
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Database |
| **Supabase Auth** | Authentication (JWT) |

### Multi-Tenant Architecture

**Business Isolation:**
- Every table (except `businesses` and `business_users`) has `business_id` column
- Row Level Security (RLS) policies enforce data isolation
- Users can only access data from their own business

**Database Tables:**

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `businesses` | Tenant businesses | id, business_name, subdomain, industry, status |
| `business_users` | User-business relationships | id, business_id, user_id, role |
| `products` | Product catalog | id, business_id, name, price, stock, category |
| `orders` | Transaction headers | id, business_id, member_id, total, payment_method |
| `order_items` | Transaction line items | id, business_id, order_id, product_id, qty, price |
| `members` | Loyalty program members | id, business_id, name, phone, email, points, total_purchases |
| `member_transactions` | Points ledger | id, member_id, order_id, type, points, description |
| `settings` | Business configuration | id, business_id, key, value |

**Indexes:**
- Performance indexes on all foreign keys
- Indexes on frequently queried columns (subdomain, category, created_at, phone)

**Row Level Security (RLS):**
- SELECT policies: Users can only view their business data
- INSERT/UPDATE/DELETE policies: Users can only modify their business data
- Policies use `auth.uid()` and `business_users` junction table

### API Architecture

**RESTful Endpoints:**

```
GET    /api/dashboard?business_id=&startDate=&endDate=
       Returns: stats, charts, top products/members, recent orders

GET    /api/products?business_id=&page=&limit=&q=&category=
POST   /api/products
       Body: { name, price, stock, category, business_id }

GET    /api/products/[id]?business_id=
PUT    /api/products/[id]
DELETE /api/products/[id]?business_id=

GET    /api/orders?business_id=&page=&limit=&startDate=&endDate=&payment_method=&q=
POST   /api/orders
       Body: { business_id, total, payment_method, member_id, points_earned, points_used, discount, items: [] }

GET    /api/orders/[id]?business_id=

GET    /api/members?business_id=&page=&limit=&q=
POST   /api/members
       Body: { name, phone, email, points, business_id }

GET    /api/members/[id]?business_id=
PUT    /api/members/[id]
DELETE /api/members/[id]?business_id=

GET    /api/settings?business_id=
PUT    /api/settings
       Body: { business_id, settings: { key: value } }

POST   /api/setup/create-business
POST   /api/setup/create-user
POST   /api/setup/complete

GET    /api/businesses/my?user_id=
```

### Caching Strategy

**Client-Side Cache (`/src/lib/clientCache.ts`):**
- In-memory Map-based cache
- Keys include business_id and query parameters
- Used for: Dashboard, Products, Orders, Members, Settings
- Reduces API calls during navigation

**Cache Keys:**
```
dashboard:{businessId}:{startDate}:{endDate}
products:{businessId}:{search}:{category}:{page}
orders:{businessId}:{filter}:{page}:{today}:{weekAgo}
members:{businessId}:{search}:{page}
settings:{businessId}
charges:{businessId}
```

### Real-time Updates

**Supabase Realtime Subscriptions:**
```typescript
supabase
  .channel(`dashboard-${business.id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: `business_id=eq.${business.id}`
  }, () => fetchDashboard())
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'members',
    filter: `business_id=eq.${business.id}`
  }, () => fetchDashboard())
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'products',
    filter: `business_id=eq.${business.id}`
  }, () => fetchDashboard())
  .subscribe()
```

### Authentication Flow

**useAuth Hook (`/src/hooks/useAuth.ts`):**
- Manages authentication state globally
- Fetches business info on login
- Caches user, business, and role
- Redirects to `/login` if unauthenticated
- Redirects to `/locked` if business is suspended
- Redirects to `/setup` if no business found

**Session Management:**
- Supabase Auth with JWT
- Session persisted in localStorage
- Auto-refresh tokens
- Service role key for server-side operations (bypasses RLS)

---

## 📁 Project Structure

```
pos-system/
├── database-schema.sql         ← RUN THIS FIRST!
├── README.md                   ← You are here
├── package.json                ← Dependencies & scripts
├── next.config.ts              ← Next.js configuration
├── tsconfig.json               ← TypeScript configuration
├── tailwind.config.ts          ← Tailwind CSS v4 configuration
├── postcss.config.mjs          ← PostCSS configuration
├── .env.local                  ← Environment variables
│
├── src/
│   ├── app/
│   │   ├── (app)/              ← Main authenticated application
│   │   │   ├── layout.tsx      ← App shell with sidebar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── pos/page.tsx
│   │   │   ├── products/page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   ├── members/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── (landing)/          ← Public marketing pages
│   │   │   ├── page.tsx        ← Homepage
│   │   │   ├── pricing/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── components/
│   │   │       ├── Navbar.tsx
│   │   │       └── Footer.tsx
│   │   │
│   │   ├── (setup)/            ← Business onboarding wizard
│   │   │   └── setup/page.tsx  ← 3-step setup wizard
│   │   │
│   │   ├── admin/              ← Super admin panel
│   │   ├── api/                ← REST API routes
│   │   │   ├── businesses/my/
│   │   │   ├── dashboard/route.ts
│   │   │   ├── members/route.ts
│   │   │   ├── members/[id]/
│   │   │   ├── orders/route.ts
│   │   │   ├── orders/[id]/
│   │   │   ├── products/route.ts
│   │   │   ├── products/[id]/
│   │   │   ├── settings/route.ts
│   │   │   └── setup/
│   │   │       ├── create-business/
│   │   │       ├── create-user/
│   │   │       └── complete/
│   │   │
│   │   ├── locked/             ← Suspended business page
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── landing/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── setup/
│   │   ├── Cart.tsx              ← Shopping cart component
│   │   ├── MemberSearch.tsx      ← Member lookup component
│   │   ├── MobileNav.tsx         ← Mobile navigation
│   │   ├── Modal.tsx             ← Reusable modal dialog
│   │   ├── PageTransition.tsx    ← Page transition animations
│   │   ├── ProductCard.tsx       ← Product display card
│   │   ├── ProductForm.tsx       ← Product add/edit form
│   │   ├── ReceiptPrinter.tsx    ← Thermal receipt printer
│   │   ├── Sidebar.tsx           ← Main navigation sidebar
│   │   └── StatCard.tsx          ← Dashboard stat card
│   │
│   ├── hooks/
│   │   └── useAuth.ts            ← Authentication state management
│   │
│   └── lib/
│       ├── business.ts           ← Business validation helpers
│       ├── clientCache.ts        ← Client-side caching (Map-based)
│       ├── supabase.ts           ← Supabase client configuration
│       ├── types.ts              ← TypeScript interfaces
│       └── utils.ts              ← Utility functions (formatIDR, dates)
│
├── public/                       ← Static assets
└── scripts/                      ← Utility scripts
```

---

## 🗄️ Database Schema

### Core Tables

#### `businesses`
Tenant businesses with complete profile information.

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100),
  slug VARCHAR(100),
  industry VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'active',
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `business_users`
Junction table linking users to businesses with roles.

```sql
CREATE TABLE business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);
```

#### `products`
Product catalog with stock tracking.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `orders`
Transaction headers with points tracking.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  total INTEGER NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  points_earned INTEGER DEFAULT 0,
  points_used INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `order_items`
Order line items with product snapshot.

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  qty INTEGER NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `members`
Loyalty program members with purchase tracking.

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  points INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);
```

#### `member_transactions`
Points ledger for audit trail.

```sql
CREATE TABLE member_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `settings`
Key-value store for business configuration.

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, key)
);
```

---

## 🚀 Deployment

### Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy
```

### Environment Variables di Vercel:

1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Project Settings → Environment Variables
3. Add variables dari `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Alternative Deployment

**Docker:**
```bash
docker build -t aegis-pos .
docker run -p 3000:3000 aegis-pos
```

**PM2:**
```bash
npm run build
pm2 start npm --name "aegis-pos" -- start
```

---

## 🛠️ Development

### Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Development Workflow

1. **Clone repository**
2. **Run `npm install`**
3. **Setup `.env.local`** dengan Supabase credentials
4. **Run `npm run dev`**
5. **Test setup flow** di `/setup`
6. **Test all features** sesuai use case

### Code Style

- **TypeScript** untuk type safety
- **Tailwind CSS** untuk styling
- **Functional components** dengan hooks
- **Server Components** untuk data fetching
- **Client Components** untuk interactivity

---

## 📈 Roadmap

### ✅ Phase 1: Core Features (COMPLETED)
- [x] Multi-tenant architecture
- [x] Complete dashboard with real-time updates
- [x] Full POS system with cart & payment
- [x] Product management with stock tracking
- [x] Order management with receipt printing
- [x] Member management with loyalty program
- [x] Settings & receipt customization
- [x] Search & filter functionality
- [x] Mobile-responsive design

### 🔜 Phase 2: Enhancement (Coming Soon)
- [ ] Export reports (PDF/Excel)
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Barcode scanner support
- [ ] Inventory alerts
- [ ] Multi-outlet support
- [ ] Batch product import (CSV)
- [ ] Product variants (size, color)

### 🚀 Phase 3: Advanced Features
- [ ] Custom domain support
- [ ] Advanced analytics (cohort analysis, retention)
- [ ] Customer feedback system
- [ ] E-commerce integration (Shopify, WooCommerce)
- [ ] Mobile app (React Native)
- [ ] Offline mode with sync
- [ ] Multi-currency support

---

## 📧 Support

Butuh bantuan atau punya pertanyaan?

- **Email:** hello@aegispos.com
- **Website:** https://aegispos.com
- **Documentation:** https://docs.aegispos.com

---

## 🏢 Powered By

**socialbrand1980**  
*Empowering businesses with technology since 1980.*

---

## ✅ Deployment Checklist

Sebelum production:

- [ ] Run `database-schema.sql` di Supabase SQL Editor
- [ ] Verify `.env.local` sudah benar
- [ ] Run `npm install`
- [ ] Run `npm run dev` untuk testing lokal
- [ ] Test setup flow di `/setup`
- [ ] Test login di `/login`
- [ ] Test POS flow (add to cart → checkout → payment → print)
- [ ] Test all CRUD operations (products, orders, members)
- [ ] Test dashboard real-time updates
- [ ] Test receipt printing (58mm & 80mm)
- [ ] Test mobile responsiveness
- [ ] Deploy to Vercel/production
- [ ] Test production environment

---

## 🎉 What's Included

### ✅ Fully Functional Pages
- **Dashboard** - Complete analytics dengan charts & stats
- **POS** - Full checkout flow dengan cart, member, payment
- **Products** - CRUD dengan stock management
- **Orders** - History dengan receipt print & search
- **Members** - CRUD dengan points management
- **Settings** - Receipt customization dengan live preview

### ✅ Improved API
- All endpoints require `business_id`
- Better validation & error handling
- Duplicate checking
- Service role untuk server operations
- Search functionality (orders, products, members)
- Date range filtering
- Payment method filtering

### ✅ Better UX
- Loading states
- Error handling dengan user-friendly messages
- Success notifications
- Responsive design (mobile-first)
- Search & filters
- Pagination
- Real-time updates via Supabase Realtime
- Client-side caching untuk performance

---

## 📊 Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js | 16.1.6 |
| **UI Library** | React | 19.2.3 |
| **Language** | TypeScript | ^5 |
| **Styling** | Tailwind CSS | ^4 |
| **Icons** | React Feather | ^2.0.10 |
| **Backend** | Next.js API Routes | - |
| **Database** | Supabase (PostgreSQL) | ^2.99.0 |
| **Auth** | Supabase Auth | - |
| **Realtime** | Supabase Realtime | - |
| **Hosting** | Vercel (recommended) | - |

---

**Happy Coding! 🚀**

Made with ❤️ for Indonesian businesses
