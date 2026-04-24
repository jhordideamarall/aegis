# AEGIS POS — Next Phase Plan
# Socialbrand 1980
# Updated: April 2026

---

## Overview

Inisiatif yang akan dikerjakan secara bertahap:

1. **AI Chat Page** — Halaman chat AI full-featured dengan kemampuan render visual
2. **Dark Mode** — Toggle light/dark seluruh web app
3. **Multi-Store** — Satu dashboard untuk semua cabang
4. **Mobile App** (Android & iOS) — AI dispatcher + user management untuk owner, menggunakan React Native
5. **Desktop** — Cukup gunakan web browser (tidak ada native desktop app)

---

## Phase 1 — AI Chat Page (Web)

### Tujuan
Upgrade dari Command Center (cmd+K modal) ke halaman chat AI yang dedicated, minimalis, dan bisa menampilkan output visual secara interaktif.

### Route
`/app/ai` — sudah ada folder-nya, tinggal diisi.

### Design Principles
- Minimalis: background putih/slate, font clean, zero clutter
- Chat bubble style: user kanan, AI kiri — **tanpa avatar sama sekali**
- **Histori chat sebagai tooltip kecil** di pojok kiri atas (bukan sidebar) — icon kecil yang on-hover/click buka popover daftar percakapan
- Full-page chat tanpa sidebar — ruang chat maksimal
- **Neon blue glow** pada composer/input saat AI sedang streaming response
- Dark mode support
- Responsive (mobile + desktop)

### Kemampuan Render Output AI

AI bisa menghasilkan berbagai format — frontend harus bisa menampilkan semua:

| Output Type | Cara Render | Library |
|---|---|---|
| **Teks biasa** | Markdown renderer | `react-markdown` + `remark-gfm` |
| **Chart** (bar, line, pie, dll) | Render dari JSON data | `recharts` atau `chart.js` |
| **Flowchart / Diagram** | Render dari Mermaid syntax | `mermaid.js` |
| **SVG interaktif** | Render langsung di DOM | dangerouslySetInnerHTML (sanitized) |
| **HTML interaktif** | Sandboxed iframe | `<iframe srcdoc>` dengan sandbox |
| **Tabel data** | Styled table component | Custom component |
| **Code block** | Syntax highlighting | `react-syntax-highlighter` |
| **shadcn/ui components** | Render JSX langsung | `shadcn` sudah terinstall (v4.4.0) |
| **Laporan PDF** | Export on demand | `jspdf` + `html2canvas` |

> **shadcn advantage:** AI bisa generate Card, Badge, Table, Chart, Alert, Progress, dll langsung pakai shadcn components yang sudah ada — output lebih polished dan konsisten dengan design system AEGIS tanpa library tambahan.

### Cara AI Tahu Harus Render Apa
AI diberi instruksi di system prompt untuk membungkus output khusus dalam tag:

```
[CHART type="bar"]{"labels":["Jan","Feb"],"data":[100,200]}[/CHART]
[MERMAID]graph TD; A-->B[/MERMAID]
[SVG]<svg>...</svg>[/SVG]
[HTML]<div>...</div>[/HTML]
[TABLE]{"headers":["Produk","Stok"],"rows":[["Kopi",10]]}[/TABLE]
[SHADCN]<Card><CardContent>...</CardContent></Card>[/SHADCN]
```

Frontend parser mendeteksi tag ini dan merender komponen yang sesuai.

### Fitur Chat Page
- [ ] **History tooltip** di pojok kiri atas — icon clock/chat kecil, klik buka popover list percakapan
- [ ] New chat button (pojok kanan atas atau di dalam tooltip)
- [ ] Delete / rename conversation (dari dalam tooltip)
- [ ] **Neon blue glow** pada composer saat streaming (CSS box-shadow animated pulse)
- [ ] Multi-format renderer (chart, mermaid, svg, html, table, code)
- [ ] Copy response button
- [ ] Export chat ke PDF
- [ ] Streaming response (SSE — reuse logic dari GlobalCommand.tsx)
- [ ] Action card untuk CRUD (reuse dari GlobalCommand.tsx)
- [ ] Search histori di dalam tooltip popover

### Files yang Perlu Dibuat/Diubah
```
src/app/(app)/ai/
├── chat/page.tsx               ← REWRITE: Full chat UI (ganti "coming soon")
├── layout.tsx                  ← Existing, tidak perlu diubah
└── components/
    ├── HistoryTooltip.tsx       ← Tooltip popover histori di pojok kiri atas
    ├── ChatBubble.tsx           ← Bubble pesan user & AI
    ├── OutputRenderer.tsx       ← Router: teks/chart/mermaid/svg/html
    ├── ChartRenderer.tsx        ← Render chart dari JSON
    ├── MermaidRenderer.tsx      ← Render flowchart/diagram
    ├── SvgRenderer.tsx          ← Render SVG (sanitized)
    ├── HtmlRenderer.tsx         ← Render HTML (sandboxed iframe)
    └── TableRenderer.tsx        ← Render tabel data

src/app/api/ai/
├── quick-chat/route.ts          ← Sudah ada (cmd+K)
├── chat/route.ts                ← BARU: untuk halaman chat (lebih panjang, multi-session)
└── conversations/
    ├── route.ts                 ← GET list, DELETE
    └── [id]/route.ts            ← GET detail, PATCH rename
```

---

## Phase 2 — Mobile App (Android & iOS)

### Tujuan
Aplikasi native untuk **owner** sebagai alat kontrol bisnis dari genggaman. Fokus pada: monitoring real-time, AI dispatcher, dan manajemen user/staff.

### Tech Stack: React Native (Expo)
- Satu codebase untuk Android & iOS
- Developer experience familiar — pakai React & TypeScript (sama dengan web)
- Expo managed workflow untuk build & deploy yang mudah
- Bisa share logic (types, utils, API calls) dengan web app

### Target User
**Owner only** — bukan kasir, bukan staff biasa.

### Fitur Utama

#### 1. AI Dispatcher (Core Feature)
AI yang bisa menerima perintah suara atau teks dan mendispatch aksi ke sistem:
- "Tambahin stok Kopi jadi 50"
- "Siapa member dengan poin terbanyak?"
- "Revenue hari ini berapa?"
- "Blokir akses Budi dari kasir"

Dispatcher AI akan parse intent dan eksekusi via API yang sudah ada.

#### 2. Dashboard Real-time
- Revenue hari ini, minggu ini, bulan ini
- Order count & trend
- Low stock alert
- Member baru

#### 3. User Management
Owner bisa kelola akses staff dari mobile:

| Role | Akses |
|---|---|
| `owner` | Full access semua fitur |
| `manager` | Dashboard, produk, pesanan, member (no settings) |
| `cashier` | POS only |
| `viewer` | Dashboard read-only |

Fitur:
- [ ] Invite staff via email
- [ ] Set role per user
- [ ] Revoke akses
- [ ] Lihat activity log per user
- [ ] Reset password staff

#### 4. Notifikasi Push
- Transaksi baru
- Stok menipis (threshold configurable)
- Staff login (opsional)
- Revenue harian summary (jam 23:00)

#### 5. Quick Actions
- Approve/reject aksi CRUD yang dipending AI
- Lihat dan cetak laporan (PDF via share sheet)

### Route Structure (React Native / Expo Router)
```
mobile/
├── app/
│   ├── (auth)/
│   │   └── login.tsx            ← Login dengan Supabase Auth
│   ├── (app)/
│   │   ├── _layout.tsx          ← Tab navigator
│   │   ├── index.tsx            ← Dashboard overview
│   │   ├── ai.tsx               ← AI Dispatcher chat
│   │   ├── users/
│   │   │   ├── index.tsx        ← Daftar staff & role
│   │   │   ├── invite.tsx       ← Kirim invite
│   │   │   └── [id].tsx         ← Detail & edit role
│   │   ├── notifications.tsx    ← Push notification center
│   │   └── settings.tsx         ← App settings
│   └── _layout.tsx              ← Root layout
│
├── components/                  ← Shared UI components
├── lib/
│   ├── supabase.ts              ← Supabase client (reuse config dari web)
│   ├── api.ts                   ← API calls ke AEGIS backend
│   └── types.ts                 ← Shared types (bisa sync dengan web)
└── app.json                     ← Expo config
```

### Backend yang Perlu Ditambah (untuk Mobile)
```
src/app/api/
├── users/
│   ├── route.ts                 ← GET list users, POST invite
│   └── [id]/route.ts            ← PATCH role, DELETE (revoke)
├── notifications/
│   └── route.ts                 ← POST register push token
└── ai/
    └── dispatch/route.ts        ← AI voice/text dispatcher endpoint
```

### Database Schema Tambahan
```sql
-- Role-based access per business
ALTER TABLE business_users ADD COLUMN IF NOT EXISTS
  role VARCHAR(50) DEFAULT 'cashier'
  CHECK (role IN ('owner', 'manager', 'cashier', 'viewer'));

-- Invite system
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'cashier',
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification tokens
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) CHECK (platform IN ('android', 'ios')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);
```

---

---

## Phase 4 — Dark Mode (Seluruh Web App)

### Kondisi Saat Ini
- **CSS variables sudah ada** di `globals.css` — `.dark` class dengan full color overrides (oklch) ✅
- **Custom variant sudah dikonfigurasi** — `@custom-variant dark (&:is(.dark *))` ✅
- **`suppressHydrationWarning`** sudah ada di `<html>` element ✅
- **Yang belum ada:** ThemeProvider, toggle button, dan ~943 hardcoded color classes perlu ditambah `dark:` variant

### Approach
Gunakan `next-themes` untuk manage state tema (localStorage + system preference detection).

### Yang Perlu Dikerjakan

#### 1. Setup Infrastructure
- [ ] Install `next-themes`
- [ ] Tambah `ThemeProvider` di `src/app/layout.tsx` wrapping `{children}`
- [ ] Update scrollbar styles di `globals.css` dengan dark mode support

#### 2. Theme Toggle Button
- Lokasi: **Sidebar** (desktop) + **MobileNav** (mobile)
- UI: Toggle switch atau icon Sun/Moon yang clean
- Simpan preferensi via `next-themes` (otomatis ke localStorage)

#### 3. Ganti Hardcoded Colors
Semua halaman dan komponen perlu audit. Pola penggantian:

| Hardcoded | Ganti Dengan |
|---|---|
| `bg-white` | `bg-background` atau tambah `dark:bg-slate-900` |
| `text-slate-900` | `text-foreground` atau tambah `dark:text-white` |
| `border-slate-200` | `border-border` atau tambah `dark:border-slate-700` |
| `bg-slate-50` | `bg-muted` atau tambah `dark:bg-slate-800` |
| `text-slate-500` | `text-muted-foreground` |

#### 4. Files yang Terdampak (Priority Order)
```
High Priority:
├── src/app/layout.tsx              ← Tambah ThemeProvider
├── src/components/Sidebar.tsx      ← Tambah toggle button + dark: classes
├── src/components/MobileNav.tsx    ← Tambah toggle + dark: classes
├── src/app/(app)/dashboard/        ← Hardcoded chart colors
├── src/app/(app)/products/         ← ~20 hardcoded instances
├── src/app/(app)/settings/         ← ~15 hardcoded instances
├── src/app/(app)/orders/           ← Hardcoded colors
├── src/app/(app)/members/          ← Hardcoded colors
└── src/app/(app)/pos/              ← Hardcoded colors

Medium Priority:
├── src/components/Cart.tsx
├── src/components/Modal.tsx
├── src/components/GlobalCommand.tsx
└── src/app/(app)/ai/chat/          ← Dark mode untuk chat page baru
```

### Dependencies
```bash
npm install next-themes
```

---

## Phase 5 — Multi-Store (Satu Dashboard, Banyak Cabang)

### Problem
Saat ini: 1 user = 1 bisnis. Owner yang punya 2+ cabang harus login terpisah untuk tiap cabang.

### Solution: Org-level Layer

Tambahkan konsep **Organization** di atas Business. Satu org bisa punya banyak business (cabang). User bisa switch antar store dari satu session.

```
Organization (Induk)
├── Business A (Cabang Jakarta)
├── Business B (Cabang Bandung)
└── Business C (Cabang Surabaya)
```

### Database Schema Tambahan

```sql
-- Organizations (induk dari semua cabang)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link businesses ke organization
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Index
CREATE INDEX idx_businesses_org ON businesses(organization_id);
```

### Store Switcher UI

**Di Sidebar (desktop) dan MobileNav:**
- Nama toko aktif ditampilkan di atas sidebar dengan dropdown arrow
- Klik → buka popover list semua cabang milik user
- Pilih cabang → update `active_business_id` di state global
- Semua data (dashboard, POS, produk, dll) langsung reload untuk cabang tersebut

```
┌─────────────────────────────┐
│ 🏪 Cabang Jakarta      ▼   │  ← Klik untuk switch
├─────────────────────────────┤
│   Cabang Bandung            │
│   Cabang Surabaya           │
│   + Tambah Cabang Baru      │
└─────────────────────────────┘
```

### Aggregate Dashboard (Owner View)

Halaman khusus yang menampilkan data semua cabang sekaligus:

```
/app/dashboard/all       ← Overview semua cabang
```

| Metric | Tampilan |
|---|---|
| Revenue total | Sum semua cabang + breakdown per cabang |
| Top produk | Agregasi dari semua cabang |
| Perbandingan cabang | Bar chart: revenue per cabang side-by-side |
| Best performing store | Highlight cabang terbaik hari ini |
| Stock alerts | Gabungan semua low stock dari semua cabang |

### Perubahan di useAuth Hook

```typescript
// Tambah active store state
const [activeBusinessId, setActiveBusinessId] = useState<string>()
const [allBusinesses, setAllBusinesses] = useState<Business[]>([])

// Switch store tanpa logout
const switchStore = (businessId: string) => {
  setActiveBusinessId(businessId)
  // Simpan ke localStorage untuk persist
  localStorage.setItem('active_business_id', businessId)
}
```

### Backend Changes
- Semua existing API endpoints sudah pakai `business_id` — **tidak perlu diubah**
- Tambah endpoint: `GET /api/businesses/all` — return semua bisnis milik user
- Tambah endpoint: `GET /api/dashboard/aggregate` — stats semua cabang sekaligus

### Migration Path (Zero Downtime)
1. Tambah `organization_id` kolom (nullable dulu)
2. Buat org otomatis untuk setiap existing business (1:1)
3. Assign semua existing businesses ke org masing-masing
4. Aktifkan store switcher di UI
5. Baru enforce org requirement untuk bisnis baru

---

## Urutan Pengerjaan yang Disarankan

```
Phase 1: AI Chat Page (Web)
  └── 2–3 minggu
  └── Prerequisite: tidak ada
  └── Output: /app/ai fully functional, history tooltip, neon composer

Phase 4: Dark Mode
  └── 1–2 minggu
  └── Prerequisite: tidak ada (bisa paralel dengan Phase 1)
  └── Output: toggle Sun/Moon di sidebar, semua halaman support dark mode

Phase 5: Multi-Store
  └── 2–3 minggu
  └── Prerequisite: schema migration ke organizations
  └── Output: store switcher di sidebar, aggregate dashboard

Phase 2: Mobile App (React Native / Expo)
  └── 5–7 minggu
  └── Prerequisite: Phase 5 (multi-store) + User management API
  └── Output: App di App Store & Play Store

Desktop: Gunakan web browser — tidak ada native desktop app
```

---

## Dependencies Baru yang Perlu Diinstall

### Phase 1 (Web — AI Chat)
```bash
npm install react-markdown remark-gfm rehype-raw
npm install mermaid
npm install react-syntax-highlighter @types/react-syntax-highlighter
npm install recharts
npm install dompurify @types/dompurify
```

### Phase 4 (Dark Mode)
```bash
npm install next-themes
```

### Phase 2 (React Native / Expo)
```bash
npx create-expo-app@latest mobile --template blank-typescript
npx expo install expo-router @supabase/supabase-js
npx expo install expo-notifications expo-speech
npx expo install react-native-gifted-charts
```

---

## PWA Polish — Install Experience (Quick Win)

Web app sudah bisa diinstall via tombol "Install" di browser (PWA sudah aktif). Yang perlu dipoles agar pengalaman install terasa premium dan bersih:

### Yang Perlu Diperbaiki

#### 1. Web App Manifest (`public/manifest.json`)
- [ ] `name` & `short_name` yang tepat: "AEGIS POS"
- [ ] `description` yang jelas
- [ ] Icons resolusi lengkap: 192x192, 512x512, maskable icon
- [ ] `theme_color` sesuai brand (slate-900 / `#0f172a`)
- [ ] `background_color` untuk splash screen
- [ ] `display: "standalone"` — hide browser UI saat diinstall
- [ ] `start_url`: `/dashboard`
- [ ] `screenshots` untuk install prompt yang lebih rich (mobile)

#### 2. Custom Install Prompt
Browser default install prompt terlalu generic. Ganti dengan custom banner yang on-brand:
- Deteksi `beforeinstallprompt` event
- Sembunyikan prompt browser, tampilkan banner custom AEGIS
- Banner: "Install AEGIS POS untuk akses lebih cepat" + tombol Install
- Muncul di landing page atau setelah login pertama

#### 3. Splash Screen & App Icon
- Icon AEGIS yang benar (bukan browser favicon generic)
- Splash screen dengan background gelap + logo centered
- Status bar color di Android sesuai theme

#### 4. Files yang Terdampak
```
public/
├── manifest.json          ← UPDATE: lengkapi semua field
├── icon-192.png           ← BUAT: icon app 192px
├── icon-512.png           ← BUAT: icon app 512px
└── icon-maskable.png      ← BUAT: icon dengan safe zone untuk Android

src/components/
└── InstallBanner.tsx      ← BUAT: custom install prompt component

src/app/layout.tsx         ← Tambah link rel manifest + theme-color meta
```

---

*Plan ini bersifat living document — update seiring perkembangan requirement.*
*Owner: Jhordi Deamarall / Socialbrand 1980*
