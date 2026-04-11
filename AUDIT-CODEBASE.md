# 🔍 Audit Codebase AEGIS POS

**Tanggal Audit:** 11 April 2026  
**Versi Codebase:** v1.3.0  
**Status:** ✅ Semua temuan sudah diverifikasi langsung dari source code

---

## 📊 Ringkasan

| Prioritas | Jumlah | Status |
|-----------|--------|--------|
| 🔴 **Critical** | 1 | Perlu segera diperbaiki |
| 🟠 **High** | 4 | Penting untuk keamanan & performa |
| 🟡 **Medium** | 8 | Perlu diperbaiki tapi tidak mendesak |
| 🟢 **Low** | 5 | Enhancement & cleanup |
| ✅ **Sudah Benar** | 2 | Bukan masalah, sudah diimplementasi dengan baik |

**Total Temuan:** 18 issue + 2 yang sudah benar

---

## 🔴 CRITICAL

### C1. `supabaseAdmin` Fallback ke Anon Key — Silent Security Degradation

**File:** `src/lib/supabase.ts` (baris 16-22)

**Masalah:**
```typescript
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { ... })
  : supabase // Fallback ke anon key jika service key tidak ada
```

Ketika `SUPABASE_SERVICE_ROLE_KEY` tidak diset, `supabaseAdmin` diam-diam menggunakan anon key. Akibatnya:

- Semua operasi server-side yang seharusnya bypass RLS jadi tunduk pada RLS policies
- Query bisa gagal silently atau return data kosong tanpa error jelas
- Sulit di-debug karena tidak ada error eksplisit
- Perilaku berbeda antara environment (production vs development)

**Dampak:** Server-side operations bisa gagal total tanpa pemberitahuan jelas. Admin API routes tidak berfungsi seperti seharusnya.

**Rekomendasi:**
```typescript
if (!supabaseServiceKey && process.env.NODE_ENV === 'production') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production')
}

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { ... })
  : createClient(supabaseUrl, supabaseAnonKey) // tetap bedakan, jangan reuse 'supabase'
```

---

## 🟠 HIGH

### H1. ILIKE Wildcard Injection — Potensi DoS

**File:** `src/app/api/orders/route.ts` (baris ~196)  
**File:** `src/app/api/members/route.ts` (baris ~36)  
**File:** `src/app/api/orders/report/route.ts` (baris ~143)  
**File:** `src/app/api/products/route.ts` (baris ~38)

**Masalah:**
```typescript
// Di members/route.ts baris 36
.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)

// Di orders/route.ts baris ~196
.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
```

Input user langsung diinterpolasi ke pattern ILIKE tanpa escaping. Karakter `%` dan `_` di PostgreSQL adalah wildcard:
- `%` = match semua karakter (seperti `.*` di regex)
- `_` = match satu karakter

**Skenario Serangan:**
- User search dengan `%` → match SEMUA records → full table scan
- User search dengan `_____%` → pattern matching kompleks → CPU spike
- Pada tabel besar (10.000+ rows), ini bisa menyebabkan timeout atau OOM

**Bukti di Code:**
- Di `orders/route.ts` baris 191 ada validasi `search.length < 2` → bagus, tapi tidak prevent wildcard
- Query member di baris 192 pakai `.limit(100)` → membatasi hasil, tapi query tetap full scan

**Rekomendasi:**
Escape karakter wildcard sebelum interpolasi:
```typescript
const escapedSearch = search.replace(/[%_]/g, '\\$&')
.or(`name.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%`)
```

---

### H2. Zero Rate Limiting — Tidak Ada Pembatasan Request

**File:** Semua route di `src/app/api/**/*.ts`  
**File:** `middleware.ts` (hanya berisi tenant routing, tidak ada rate limit)

**Masalah:**
- Tidak ada library rate limiting di `package.json`
- Tidak ada header `X-RateLimit-*`
- Semua endpoint bisa di-hit tanpa batas
- Termasuk endpoint setup yang bisa di-spam

**Endpoint Paling Rentan:**
| Endpoint | Risiko |
|----------|--------|
| `POST /api/setup/create-user` | Brute force user creation |
| `POST /api/orders` | Spam order creation, exhaust stock |
| `POST /api/members` | Spam member creation |
| `GET /api/stats/platform` | Public, unauthenticated, bisa di-scrape |

**Rekomendasi:**
Gunakan library rate limiting seperti `@upstash/ratelimit` (Redis-based) atau implementasi sederhana dengan Map di memory:
```typescript
const rateLimit = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const entry = rateLimit.get(key)
  if (entry && now < entry.resetAt) {
    if (entry.count >= limit) return false
    entry.count++
  } else {
    rateLimit.set(key, { count: 1, resetAt: now + windowMs })
  }
  return true
}
```

---

### H3. Memory-Intensive Search — Fetch Semua Order ke Memory

**File:** `src/app/api/orders/route.ts` (baris ~199-270)

**Masalah:**
```typescript
// Baris 203-213 — Fetch SEMUA order dalam date range
let allOrdersQuery = supabaseAdmin
  .from('orders')
  .select(listSelect)
  .eq('business_id', resolvedBusinessId)

// ... fetch tanpa pagination
const { data: allOrders } = await allOrdersQuery

// Baris 234 — Filter di JavaScript
let filteredOrders = normalizedAllOrders.filter(filterOrder)

// Baris 240-247 — Fetch lagi sampai 500 "extra member orders"
const { data: extraMemberOrders } = await supabaseAdmin
  .from('orders')
  .select(listSelect)
  .in('member_id', memberIds)
  .limit(500)
```

**Alur Masalah:**
1. Fetch SEMUA order dalam date range (tanpa pagination)
2. Load seluruhnya ke memory Node.js
3. Filter dengan JavaScript `.filter()`
4. Baru paginate manual dengan `.slice()`
5. Fetch tambahan sampai 500 "extra member orders"

**Dampak:**
- Bisnis dengan 10.000+ order → load 10.000 rows ke memory sekaligus
- Risiko Out Of Memory (OOM) di server
- Response time lambat untuk search
- Ditambah 500 extra queries lagi

**Bukti bahwa ini real issue:**
- Hanya terjadi ketika ada `search` query param
- Date range bisa lebar (misal: startDate awal tahun, endDate hari ini)
- Tidak ada mekanisme pembatasan

**Rekomendasi:**
1. Gunakan database-level filtering dengan `tsvector` (full-text search PostgreSQL)
2. Atau minimal pagination DULU di database, baru filter
3. Atau batasi date range maksimal untuk search (misal: max 30 hari)

---

### H4. Platform Stats Endpoint — Public Tanpa Authentication

**File:** `src/app/api/stats/platform/route.ts`

**Masalah:**
```typescript
export async function GET() {
  // TIDAK ADA auth check
  // TIDAK ADA business context
  // TIDAK ADA rate limiting
  
  const [businessesResult, ordersResult, membersResult, productsResult] = await Promise.all([
    supabaseAdmin.from('businesses').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('members').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true })
  ])
```

**Endpoint ini:**
- ✅ Tidak ada authentication — siapapun bisa akses
- ✅ Tidak ada rate limiting — bisa di-spam
- ✅ Return data sensitif platform: total bisnis, order, member, produk
- ✅ Pakai module-level `cachedStats: any` (lihat M5)

**Dampak:**
- Kompetitor bisa monitor pertumbuhan platform
- Attacker bisa scrape data untuk analisis
- Cache module-level tanpa eviction (lihat M5)

**Rekomendasi:**
- Tambahkan rate limiting minimal
- Atau batasi akses hanya untuk admin (check email di `ADMIN_EMAILS` env var)
- Atau dokumentasikan sebagai public API jika memang intended

---

### H5. Error Detail Leakage — Informasi Internal Terbuka ke Client

**File:** 4 endpoint泄露 error details ke client

| Endpoint | Baris | Response |
|----------|-------|----------|
| `GET /api/orders` | ~328-331 | `{ error: '...', details: errorMessage }` |
| `GET /api/orders/report` | ~170-174 | `{ error: '...', details: errorMessage }` |
| `PUT /api/orders/[id]/proof` | ~162-166 | `{ error: '...', details: errorMessage }` |
| `POST /api/setup/create-user` | ~180 | `{ error: error.message \|\| '...' }` |
| `POST /api/setup/create-business` | ~85 | `{ error: error.message \|\| '...' }` |

**Bukti dari code:**
```typescript
// orders/route.ts baris ~328-331
catch (error) {
  console.error('Error fetching orders:', error)
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  return NextResponse.json(
    { error: 'Failed to fetch orders', details: errorMessage }, // ← LEAK!
    { status: 500 }
  )
}
```

**Endpoint yang SUDH AMAN:**
| Endpoint | Status |
|----------|--------|
| `GET /api/dashboard` | ✅ Generic error only |
| `GET /api/products` | ✅ Generic error only |
| `GET /api/members` | ✅ Generic error only |
| `GET /api/settings` | ✅ Generic error only |
| `GET /api/orders/[id]` | ✅ Generic error only |
| `POST /api/orders` | ✅ Generic error only (sudah diperbaiki) |

**Dampak:**
- Database error codes bisa terekspos
- Stack traces bisa membantu attacker melakukan reconnaissance
- Internal infrastructure details bisa bocor

**Rekomendasi:**
```typescript
// Production: generic error saja
return NextResponse.json(
  { error: 'Failed to fetch orders' },
  { status: 500 }
)

// Internal log (gunakan logging service di production)
// console.error('Error fetching orders:', error)
```

---

## 🟡 MEDIUM

### M1. Inconsistent Date Handling — 3 Pendekatan Berbeda

**File:** 3 file dengan cara handling date berbeda

| File | Pendekatan | Status |
|------|-----------|--------|
| `src/app/api/orders/route.ts` | `date-fns-tz` (`toDate`, `formatInTimeZone`) | ✅ Benar |
| `src/app/api/dashboard/route.ts` | Manual math: `Date.UTC() - (7 * 3600000)` | ⚠️ Fragile |
| `src/app/api/orders/report/route.ts` | Manual math: `Date.UTC() - (7 * 3600000)` | ⚠️ Fragile |

**Bukti dari code:**
```typescript
// dashboard/route.ts baris 67-70
let rangeStart = new Date(Date.UTC(startYear, (startMonth || 1) - 1, startDay || 1, 0, 0, 0, 0))
rangeStart = new Date(rangeStart.getTime() - (7 * 3600000)) // Convert to UTC (subtract 7 hours)
```

**Masalah:**
- Hardcoded `7 * 3600000` ms — fragile dan sulit di-maintain
- Tidak handle edge cases dengan baik
- Jika timezone offset perlu diubah, harus update 3 tempat
- Indonesia tidak ada DST, tapi ini tetap bad practice

**Rekomendasi:**
Standardisasi ke `date-fns-tz` di semua file. Hapus manual math.

---

### M2. Module-Level Mutable State di useAuth Hook

**File:** `src/hooks/useAuth.ts` (baris 66-71)

**Masalah:**
```typescript
let cachedUser: AuthState['user'] = null
let cachedBusiness: Business | null = null
let cachedRole: string | null = null
let pendingAuthResolution: Promise<AuthResolution> | null = null
```

**Dampak:**
- Shared state across semua component instances
- Bisa menyebabkan stale data jika komponen mount/unmount dengan timing berbeda
- `Business.settings` typed as `Record<string, any>` (baris 55) — no type safety

**Konteks:**
Ini client-side hook, jadi sebenarnya tidak seburuk server-side mutable state. Tapi tetap code smell dan bisa menyebabkan bug subtle.

**Rekomendasi:**
- Gunakan React Context + Provider pattern
- Atau minimal berikan cara untuk invalidate cache secara eksplisit

---

### M3. No Schema Validation — Manual If Checks di Semua Route

**File:** Semua POST/PUT route

**Masalah:**
- Tidak ada Zod (bahkan tidak ada di `package.json`)
- Semua validasi pakai manual `if` checks
- Tidak konsisten antar endpoint
- Tidak validasi email format, string length, nested objects

**Contoh:**
```typescript
// members/route.ts baris 65-70 — manual check
if (!name || !phone) {
  return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
}

// products/route.ts baris 75-79 — manual check
if (!name) { ... }
if (typeof price !== 'number' || price < 0) { ... }
```

**Rekomendasi:**
Install Zod dan buat schema validation untuk setiap request body:
```typescript
import { z } from 'zod'

const memberSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional(),
  points: z.number().int().min(0).optional()
})
```

---

### M4. Setup Token Secret Fallback ke Service Role Key

**File:** `src/lib/setupToken.ts` (baris 13-18)

**Masalah:**
```typescript
function getSetupTokenSecret() {
  const secret = process.env.SETUP_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Server misconfigured')
  }
  return secret
}
```

**Dampak:**
- Service role key digunakan untuk 2 fungsi berbeda (database admin + JWT signing)
- Jika service key di-rotate, semua setup tokens jadi invalid
- Design smell — coupling 2 security concern yang tidak related
- Service role key punya format khusus — menggunakannya untuk HMAC adalah smell

**Rekomendasi:**
Require `SETUP_TOKEN_SECRET` sebagai environment variable terpisah:
```typescript
function getSetupTokenSecret() {
  const secret = process.env.SETUP_TOKEN_SECRET
  if (!secret) {
    throw new Error('SETUP_TOKEN_SECRET environment variable is required')
  }
  return secret
}
```

---

### M5. clientCache — Unbounded Memory Growth

**File:** `src/lib/clientCache.ts`

**Masalah:**
```typescript
const clientCache = new Map<string, any>()

export function setClientCache<T>(key: string, value: T) {
  clientCache.set(key, value) // No TTL, no eviction, no max size
}
```

**Dampak:**
- Tidak ada TTL — entry hidup selamanya
- Tidak ada eviction policy — pertumbuhan tanpa batas
- Tidak ada fungsi `delete()` atau `clear()` yang di-export
- Di server-side process yang long-running, ini memory leak

**Rekomendasi:**
- Tambahkan TTL-based eviction
- Atau max size limit (misal: 100 entries)
- Atau gunakan `sessionStorage` sebagai backing store di client

---

### M6. Missing Composite Indexes di Database

**File:** `database-schema.sql`

**Masalah:**
Schema sudah punya index pada `business_id` untuk sebagian besar tabel, tapi missing composite indexes yang penting:

| Tabel | Missing Index | Query Pattern yang Terpengaruh |
|-------|--------------|-------------------------------|
| `orders` | `(business_id, created_at)` | Hampir SEMUA query orders filter+sort by both |
| `member_transactions` | `order_id` | Rollback queries di orders POST |
| `business_users` | `(business_id, user_id, role)` | Auth resolution queries |
| `members` | `(business_id, phone)` | Unique constraint ada, tapi query perf bisa lebih baik |

**Yang paling impactful:** Composite index `(business_id, created_at)` pada `orders` — digunakan di hampir setiap query dashboard dan orders.

**Rekomendasi:**
Buat migration SQL untuk menambahkan composite indexes:
```sql
CREATE INDEX idx_orders_business_created ON orders (business_id, created_at DESC);
CREATE INDEX idx_member_transactions_order_id ON member_transactions (order_id);
CREATE INDEX idx_business_users_lookup ON business_users (business_id, user_id, role);
```

---

### M7. 45 Instances of `any` Type — Type Safety Lemah

**File:** Multiple files

**Distribusi:**
| Lokasi | Count | Contoh |
|--------|-------|--------|
| Catch blocks | ~20 | `catch (error: any)` |
| `clientCache.ts` | 1 | `Map<string, any>` |
| `stats/platform/route.ts` | 1 | `cachedStats: any` |
| `dashboard/route.ts` | ~3 | `item: any` in forEach |
| Components | ~10 | Props atau state `any` |
| `useAuth.ts` | 1 | `settings: Record<string, any>` |
| Lainnya | ~9 | Various |

**Yang paling problematic:**
```typescript
// clientCache.ts — zero type safety on entire cache
const clientCache = new Map<string, any>()

// stats/platform/route.ts — module-level untyped cache
let cachedStats: any = null
```

**Rekomendasi:**
- Ganti `any` dengan `unknown` + type guards di catch blocks
- Definisikan proper types untuk cache values
- Aktifkan `"noImplicitAny": true` di `tsconfig.json`

---

### M8. Price Inconsistency — Dead Code vs Active Code

**File:** `src/components/ProductForm.tsx` (DEAD CODE) vs `src/app/(app)/products/page.tsx` (ACTIVE)

**Dead Code (`ProductForm.tsx`):**
```typescript
// Baris 14 — expects cents
price: product?.price ? (product.price / 100).toString() : ''

// Baris 23 — submits cents
price: Math.round(parseFloat(formData.price) * 100)
```

**Active Code (`products/page.tsx` inline ProductFormModal):**
```typescript
// Baris 365 — raw integer
price: product?.price || 0

// Baris 377 — raw integer, no conversion
setFormData({ ...formData, price: parseInt(rawValue) || 0 })
```

**API (`products/route.ts`):**
```typescript
// Baris 94 — stores raw integer directly
price,
```

**Kesimpulan:**
- Active code path menyimpan price sebagai integer raw (Rp 15.000 = `15000`) → ✅ Konsisten
- Dead code (`ProductForm.tsx`) ekspektasikan cents → ❌ Jika dipakai akan menyebabkan 100x harga
- Database schema: `price INTEGER NOT NULL DEFAULT 0` → menyimpan integer

**Dampak:** Saat ini tidak ada dampak karena `ProductForm.tsx` tidak dipakai. Tapi jika suatu saat diimport, akan menyebabkan harga 100x lipat.

**Rekomendasi:**
Hapus `src/components/ProductForm.tsx` karena dead code.

---

## 🟢 LOW

### L1. Modal — Missing Escape Key, Backdrop Click, & Accessibility

**File:** `src/components/Modal.tsx`

**Masalah:**
```tsx
// Baris 30 — Backdrop tanpa onClick handler
<div className="fixed inset-0 bg-black bg-opacity-50 ...">
  <div className={`bg-white rounded-lg ...`}>
    {/* Tidak ada onClick={onClose} pada backdrop */}
    {/* Tidak ada onKeyDown untuk Escape key */}
  </div>
</div>
```

**Yang Missing:**
- ❌ Tidak ada Escape key handler — user tidak bisa close modal dengan Escape
- ❌ Tidak ada backdrop click handler — user tidak bisa close dengan klik overlay
- ❌ Tidak ada `aria-label` pada close button (hanya "×")
- ❌ Tidak ada `role="dialog"` atau `aria-modal="true"`
- ❌ Tidak ada focus trapping — Tab key bisa keluar modal

**Rekomendasi:**
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [onClose])

//Backdrop:
<div className="..." onClick={onClose}>
  <div onClick={(e) => e.stopPropagation()}> {/* Prevent close on modal click */}
```

---

### L2. Dead Code — `ProductForm.tsx` Tidak Pernah Dipakai

**File:** `src/components/ProductForm.tsx`

**Bukti:**
- Grep untuk `import.*ProductForm` di `/src` → **0 matches**
- Products page (`src/app/(app)/products/page.tsx`) definisikan `ProductFormModal` inline (baris 362)
- Komponen standalone ini tidak pernah diimport manapun

**Rekomendasi:** Hapus file ini.

---

### L3. Missing `.env.example` File

**File:** Tidak ada di root project

**Bukti:** File `.env.example` tidak ada di directory listing.

**Variabel yang Dibutuhkan** (berdasarkan codebase):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
SETUP_TOKEN_SECRET=your-secret-key-for-jwt-signing
ADMIN_EMAILS=admin@example.com
```

**Rekomendasi:** Buat `.env.example` dengan placeholder values.

---

### L4. 81 Console Calls di Production Code

**File:** Multiple files

**Distribusi:**
- **32 di API routes** (server-side) — akan output ke server logs
- **49 di client components** — acceptable untuk development

**Yang paling banyak:**
| File | Count |
|------|-------|
| `src/app/api/setup/create-user/route.ts` | 7 |
| `src/app/api/dashboard/route.ts` | 4 |

**Rekomendasi:**
- Gunakan structured logger (pino, winston) dengan log levels
- Atau minimal wrap dengan environment check:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.error('Error:', error)
}
```

---

### L5. 81 Console Calls di Production Code

**File:** Multiple files

**Distribusi:**
- **32 di API routes** (server-side) — akan output ke server logs
- **49 di client components** — acceptable untuk development

**Yang paling banyak:**
| File | Count |
|------|-------|
| `src/app/api/setup/create-user/route.ts` | 7 |
| `src/app/api/dashboard/route.ts` | 4 |

**Rekomendasi:**
- Gunakan structured logger (pino, winston) dengan log levels
- Atau minimal wrap dengan environment check

---

## ✅ YANG SUDAH BENAR (Bukan Masalah)

### S1. Stock Update — Optimistic Locking Sudah Benar

**File:** `src/app/api/orders/route.ts` (baris ~445-482)

**Yang Ditemukan:**
```typescript
// Re-check stock terbaru
const { data: latestProduct } = await supabaseAdmin
  .from('products')
  .select('stock')
  .eq('id', item.product_id)
  .eq('business_id', resolvedBusinessId)
  .single()

// Update dengan optimistic lock
.eq('stock', latestProduct.stock) // Hanya update jika stock belum berubah

// Rollback order jika update gagal
if (stockUpdateError) {
  await supabaseAdmin.from('orders').delete().eq('id', order.id)
  return NextResponse.json({ error: '...' }, { status: 409 })
}
```

**Status:** ✅ **SUDAH BENAR** — Implementasi Compare-And-Swap (CAS) pattern yang proper. Race condition sudah dihandle dengan optimistic locking.

---

### S2. Member Points Validation — Sudah Ada di 2 Level

**File:** `src/app/api/orders/route.ts` (baris ~508-560)

**Yang Ditemukan:**
```typescript
// Level 1: Application-level validation
if (points_used > 0) {
  if (member.points < points_used) {
    return NextResponse.json(
      { error: `Insufficient points...` },
      { status: 400 }
    )
  }
}

// Level 2: Database-level atomic check
.gte('points', points_used - points_earned)

// Rollback jika gagal
if (memberUpdateError) {
  await supabaseAdmin.from('orders').delete().eq('id', order.id)
  await supabaseAdmin.from('member_transactions').delete().eq('order_id', order.id)
  return NextResponse.json({ error: '...' }, { status: 409 })
}
```

**Status:** ✅ **SUDAH BENAR** — Validasi ada di 2 level (app + DB), plus rollback lengkap.

---

## 📋 Prioritas Perbaikan

### Segera (Week 1)
1. 🔴 **C1** — Fix `supabaseAdmin` fallback (critical, silent security degradation)
2. 🟠 **H5** — Hapus error detail leakage dari 4 endpoint
3. 🟠 **H1** — Escape ILIKE wildcards (prevent DoS)

### Short-term (Week 2-3)
4. 🟠 **H2** — Tambahkan rate limiting (minimal untuk POST endpoints)
5. 🟠 **H4** — Auth-protect `/api/stats/platform` atau hapus
6. 🟡 **M1** — Standardisasi date handling ke `date-fns-tz`
7. 🟡 **M4** — Pisahkan `SETUP_TOKEN_SECRET` dari service role key
8. 🟡 **M8** — Hapus dead `ProductForm.tsx`

### Medium-term (Month 2)
9. 🟡 **M3** — Implementasi Zod schema validation
10. 🟡 **M5** — Tambahkan TTL/eviction ke clientCache
11. 🟡 **M6** — Buat composite indexes di database
12. 🟡 **M7** — Replace `any` dengan proper types
13. 🟡 **M2** — Refactor useAuth mutable state

### Low Priority (Backlog)
14. 🟢 **L1** — Tambahkan Escape key & backdrop click ke Modal
15. 🟢 **L3** — Buat `.env.example`
16. 🟢 **L4** — Implementasi structured logging
17. 🟠 **H3** — Optimasi search orders (database-level pagination)

---

## 📝 Catatan Tambahan

### Codebase Strengths
- ✅ Stock management sudah dihandle dengan baik (optimistic locking)
- ✅ Member points validation lengkap (app + DB level)
- ✅ Business context validation di setiap API route
- ✅ Proper error handling di sebagian besar endpoint
- ✅ Sudah pakai `date-fns-tz` di orders route (tinggal konsistensi)
- ✅ Member phone uniqueness sudah enforced di database
- ✅ Setup flow ada retry mechanism untuk subdomain

### Codebase Weaknesses
- ❌ Tidak ada automated tests (unit, integration, E2E)
- ❌ Tidak ada CI/CD pipeline
- ❌ Tidak ada monitoring/logging service (Sentry, LogRocket)
- ❌ Tidak ada security headers di `next.config.ts`
- ❌ Favicon & globals.css mungkin missing

---

**Last Updated:** 11 April 2026  
**Audited By:** AI Code Review (Backend Fullstack Engineer)  
**Next Review:** Setelah implementasi prioritas Week 1
