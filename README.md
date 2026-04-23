# AEGIS POS

**Sistem Point of Sale untuk UMKM Indonesia, terintegrasi dengan AI.**

[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?logo=supabase)](https://supabase.com)
[![Powered by Socialbrand 1980](https://img.shields.io/badge/Powered%20by-Socialbrand%201980-black)](https://socialbrand1980.com)

---

## Akses

**https://aegis.socialbrand1980.com**

---

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **POS** | Kasir digital dengan cart, member, dan berbagai metode pembayaran |
| **Dashboard** | Analytics real-time — revenue, order, produk, dan member |
| **Produk** | Manajemen stok lengkap dengan kategori |
| **Pesanan** | Riwayat transaksi, cetak struk thermal 58mm & 80mm |
| **Member** | Program loyalitas dengan sistem poin |
| **Settings** | Konfigurasi struk, pajak, dan service charge |
| **Aegis AI** | Business advisor AI — analisis bisnis, saran strategis, dan eksekusi CRUD via `Cmd+K` |

---

## AI Business Advisor

Tekan **`Cmd+K`** (atau `Ctrl+K`) untuk membuka Aegis AI — asisten bisnis yang:

- Tau kondisi bisnis kamu secara real-time (produk, stok, member, transaksi, revenue)
- Bisa kasih insight dan saran actionable
- Bisa update produk, stok, member, dan settings langsung dari chat
- Punya memory dari percakapan sebelumnya
- Bahasa santai tapi tetap profesional

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| AI | OpenRouter API |
| Hosting | Vercel |

---

## Development

```bash
# Clone & install
npm install

# Setup environment
cp .env.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY

# Run
npm run dev
```

Schema database ada di `supabase/schema.sql`. Migration files ada di folder `supabase/`.

---

## Struktur Project

```
src/
├── app/
│   ├── (app)/          ← Halaman utama (dashboard, pos, produk, dll)
│   ├── (landing)/      ← Landing page & login
│   ├── (setup)/        ← Wizard onboarding bisnis baru
│   ├── admin/          ← Super admin panel
│   └── api/            ← REST API + AI endpoints
├── components/         ← UI components
├── hooks/              ← useAuth & custom hooks
└── lib/                ← Utils, Supabase client, types

supabase/               ← SQL migrations & schema
```

---

**Powered by [Socialbrand 1980](https://socialbrand1980.com)**
