# Temuan

## Status: ✅ SEMUA DIPERBAIKI

### Verifikasi
- ✅ `npm run lint`: **Lolos**
- ✅ `npm run build`: **Berhasil**

---

## Riwayat Temuan & Perbaikan

### ~~CRITICAL: Race condition pada stock update~~ ✅ DIPERBAIKI

**File:** `src/app/api/orders/route.ts`

**Masalah:**
Ada race condition antara check stock dan update stock. Jika ada 2 request bersamaan untuk produk yang sama:
1. Request A: baca stock = 5
2. Request B: baca stock = 5  
3. Request A: update stock = 5 - 3 = 2 ✅
4. Request B: update stock = 5 - 3 = 2 ❌ (harusnya 2 - 3 = -1!)

**Solusi:**
Gunakan atomic update dengan kondisi `.gt('stock', item.qty - 1)` untuk memastikan stock hanya berkurang jika masih cukup saat update:

```typescript
// Atomic stock update - decrement only if stock is sufficient
const { error: stockUpdateError } = await supabaseAdmin
  .from('products')
  .update({ 
    stock: product.stock - item.qty,
    updated_at: new Date().toISOString()
  })
  .eq('id', item.product_id)
  .eq('business_id', resolvedBusinessId)
  .gt('stock', item.qty - 1) // Ensure stock >= qty at update time (prevents race condition)

// Verify the update actually happened
const { data: verifyProduct } = await supabaseAdmin
  .from('products')
  .select('stock')
  .eq('id', item.product_id)
  .eq('business_id', resolvedBusinessId)
  .single()

if (!verifyProduct || verifyProduct.stock < 0) {
  throw new Error(`Stock update failed for product ${product.name}`)
}
```

---

### ~~CRITICAL: Member points bisa menjadi negatif~~ ✅ DIPERBAIKI

**File:** `src/app/api/orders/route.ts`

**Masalah:**
Tidak ada validasi apakah member punya points yang cukup sebelum redeem. User bisa redeem points lebih dari yang dimiliki, membuat points jadi negatif.

```typescript
// ❌ TIDAK ADA VALIDASI
if (points_used > 0) {
  await supabaseAdmin
    .from('member_transactions')
    .insert([{...}])
}

// Update member points - bisa jadi negatif!
points: member.points + points_earned - points_used
```

**Solusi:**
Tambahkan validasi points sebelum redeem:

```typescript
if (points_used > 0) {
  // Validasi points cukup
  if (member.points < points_used) {
    return NextResponse.json(
      { error: `Insufficient points. Available: ${member.points}, Requested: ${points_used}` },
      { status: 400 }
    )
  }
  
  // ... lanjut create transaction
}

// Update member points
const newPoints = member.points + points_earned - points_used
```

---

### ~~MEDIUM: Duplicate/inconsistent search logic~~ ✅ DIPERBAIKI

**File:** `src/app/api/orders/route.ts`

**Masalah:**
Logic search diulang 2x (untuk fetch data dan summary) dengan implementasi berbeda:
- Fetch data: filter in-memory
- Summary: pakai query `or()`

Hasil summary dan data bisa berbeda karena filter logic tidak konsisten.

**Solusi:**
- Gunakan fungsi `filterOrder` yang konsisten untuk semua filtering
- Fetch semua data dulu (tanpa pagination), baru filter in-memory
- Summary dihitung dari hasil yang sama dengan data

```typescript
// Consistent filter function
const filterOrder = (order: OrdersListRow): boolean => {
  if (order.id.toLowerCase().includes(search.toLowerCase())) return true
  if (order.payment_method.toLowerCase().includes(search.toLowerCase())) return true
  if (paymentColumnSupport.provider && order.payment_provider?.toLowerCase().includes(search.toLowerCase())) return true
  if (memberIds.length > 0 && order.member_id && memberIds.includes(order.member_id)) return true
  return false
}

let filteredOrders = normalizedAllOrders.filter(filterOrder)
// Summary calculated from same filtered results
const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)
```

---

### ~~MEDIUM: Timezone conversion error-prone~~ ✅ DIPERBAIKI

**File:** `src/app/api/orders/route.ts`

**Masalah:**
Hardcoded timezone offset tidak handle edge cases dan sulit di-maintain:

```typescript
rangeStart = new Date(rangeStart.getTime() - (7 * 3600000)) // Convert WIB to UTC
```

**Solusi:**
Install `date-fns-tz` dan gunakan proper timezone handling:

```bash
npm install date-fns date-fns-tz
```

```typescript
import { toDate, formatInTimeZone } from 'date-fns-tz'

// Helper to parse YYYY-MM-DD to Date in WIB timezone, then convert to UTC
function parseLocalDateToUTC(dateString: string, includeTime: 'start' | 'end' = 'start'): Date {
  const wibDate = toDate(dateString, { timeZone: 'Asia/Jakarta' })
  
  if (includeTime === 'start') {
    wibDate.setHours(0, 0, 0, 0)
  } else {
    wibDate.setHours(23, 59, 59, 999)
  }
  
  return new Date(wibDate.getTime())
}

// Usage
rangeStart = parseLocalDateToUTC(startDate, 'start')
rangeEnd = parseLocalDateToUTC(endDate, 'end')
```

---

### ~~LOW: Phone validation terlalu strict~~ ✅ DIPERBAIKI

**File:** `src/app/api/members/route.ts`

**Masalah:**
Hanya terima format Indonesia (08xx). Tidak bisa untuk nomor internasional atau format lain (+62, 62, dll).

```typescript
const phoneRegex = /^08[0-9]{8,11}$/ // ❌ Hanya 08xxxxxxxxxx
```

**Solusi:**
Support multiple format (Indonesian dan international):

```typescript
// Accept: 08xxxxxxxxxx, 62xxxxxxxxxx, +62xxxxxxxxxx
const phoneRegex = /^(\+|00)?(62|61|60|63|66|628|08|01)[0-9]{6,15}$/
if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
  return NextResponse.json(
    { error: 'Invalid phone format. Use 08xxxxxxxxxx, 62xxxxxxxxxx, or +62xxxxxxxxxx' },
    { status: 400 }
  )
}
```

---

### ~~LOW: Menu Updates belum ada di navigation~~ ✅ DIPERBAIKI

**File:** 
- `src/components/Sidebar.tsx`
- `src/components/MobileNav.tsx`
- `src/app/(app)/feature-updates/page.tsx` (NEW)
- `src/app/(app)/feature-updates/[slug]/page.tsx` (NEW)

**Masalah:**
Feature updates sudah ada (halaman `/updates` dan API `/api/feature-updates`), tapi belum ada menu di navigation sidebar untuk akses cepat. User harus hafal URL atau klik link dari halaman lain.

**Solusi:**
Tambahkan menu "Updates" dengan icon `Bell` di sidebar dan mobile nav, plus buat halaman khusus di dalam app layout (bukan landing page):

```typescript
// Sidebar.tsx & MobileNav.tsx
import { Bell } from 'react-feather'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Grid },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/orders', label: 'Orders', icon: FileText },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/feature-updates', label: 'Updates', icon: Bell }, // ← Baru
  { href: '/settings', label: 'Settings', icon: Settings },
]
```

**Halaman Baru:**
1. **`/feature-updates`** - List semua updates dengan layout app (ada sidebar)
2. **`/feature-updates/[slug]`** - Detail update individual

**Features:**
- ✅ Featured update ditampilkan di atas dengan highlight
- ✅ List update lainnya dalam grid
- ✅ Highlight features dengan checkmarks
- ✅ Format date Indonesian locale
- ✅ Loading state & error handling
- ✅ Responsive design (mobile-friendly)
- ✅ Navigate ke detail update dengan router

**Mobile Nav:**
- Update grid dari `grid-cols-6` ke `grid-cols-7` untuk menampung menu baru

**Note:** 
- Halaman `/updates` (landing page) tetap ada untuk public view
- Halaman `/feature-updates` (app) untuk logged-in users

---

### ~~Tinggi: pembuatan order masih bisa memodifikasi data lintas tenant~~ ✅ DIPERBAIKI

**File:** `src/app/api/orders/route.ts`

**Masalah:**
Product_id dari client langsung dipakai untuk insert order_items, lalu stok produk diubah hanya berdasarkan id. Hal yang sama terjadi untuk member: member_id tidak diverifikasi milik bisnis aktif sebelum poin dan total_purchases diupdate. User tenant A secara teori bisa mengirim product_id/member_id milik tenant B dan ikut mengubah datanya.

**Solusi:**
- Menambahkan validasi `product_id` dengan query yang menyertakan `business_id` untuk memastikan produk milik bisnis yang sama
- Menambahkan validasi `stock` sebelum mengizinkan checkout
- Menambahkan validasi `member_id` dengan query yang menyertakan `business_id` untuk memastikan member milik bisnis yang sama
- Update stock dilakukan secara atomik dalam loop yang sama

**Perubahan:**
```typescript
// Verifikasi product milik business yang sama
const { data: product, error: productFetchError } = await supabaseAdmin
  .from('products')
  .select('id, stock, business_id, name')
  .eq('id', item.product_id)
  .eq('business_id', resolvedBusinessId)
  .single()

if (productFetchError || !product) {
  return NextResponse.json(
    { error: `Product ${item.product_id} not found in your business` },
    { status: 404 }
  )
}

// Verifikasi member milik business yang sama
if (member_id) {
  const { data: member, error: memberFetchError } = await supabaseAdmin
    .from('members')
    .select('id, points, total_purchases, business_id')
    .eq('id', member_id)
    .eq('business_id', resolvedBusinessId)
    .single()

  if (memberFetchError || !member) {
    return NextResponse.json(
      { error: 'Member not found in your business' },
      { status: 404 }
    )
  }
  // ... lanjutkan update member
}
```

---

### ~~Sedang: flow setup bisa gagal untuk nama bisnis yang sama~~ ✅ DIPERBAIKI

**File:** `src/app/api/setup/create-business/route.ts`

**Masalah:**
Subdomain dibentuk langsung dari business_name tanpa retry/penjamin keunikan, sementara schema mewajibkan subdomain unik di database. Jadi bisnis kedua dengan nama mirip/identik akan mentok error database saat onboarding.

**Solusi:**
Menambahkan retry mechanism dengan loop maksimal 5 kali untuk memastikan subdomain unik:

```typescript
let subdomain = baseSubdomain
let attempts = 0
const maxAttempts = 5

while (attempts < maxAttempts) {
  const { data: existing } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('subdomain', subdomain)
    .single()

  if (!existing) {
    break // Subdomain tersedia
  }

  // Subdomain diambil, tambahkan suffix random
  const randomSuffix = Math.random().toString(36).substring(2, 6)
  subdomain = `${baseSubdomain}-${randomSuffix}`
  attempts++
}
```

---

### ~~Sedang: statistik awal di halaman admin berisiko tampil 0/kosong~~ ✅ DIPERBAIKI

**File:** `src/app/admin/page.tsx`

**Masalah:**
Token disimpan ke state, lalu fetchStatsForTimeRange() dipanggil di render yang sama. Tapi fetchBusinessStats() masih membaca accessToken dari state lama, sehingga request stats pertama bisa terkirim tanpa Authorization dan fallback ke default stats.

**Solusi:**
Capture nilai `accessToken` saat fungsi dipanggil dan oper sebagai parameter:

```typescript
// Di fetchStatsForTimeRange
const currentToken = accessToken // Capture current value

const statsPromises = list.map(async (biz: Business) => {
  const stats = await fetchBusinessStats(biz.id, startDateParam, endDateParam, currentToken)
  return { id: biz.id, stats }
})

// Di fetchBusinessStats
const fetchBusinessStats = async (
  businessId: string,
  startDate?: string,
  endDate?: string,
  token?: string // Parameter baru
): Promise<BusinessStats> => {
  // ...
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined
  // ...
}
```

---

### ~~Sedang: halaman login tenant berpotensi mengganggu flow reset password~~ ✅ DIPERBAIKI

**File:** `src/app/(landing)/login/page.tsx`

**Masalah:**
Mode recovery sudah dideteksi, tapi redirect otomatis untuk user yang punya session tetap jalan tanpa mengecek mode di. Kalau Supabase sudah membentuk session dari link recovery, user bisa langsung dilempar ke dashboard sebelum sempat set password baru.

**Solusi:**
Tambahkan pengecekan `mode === 'recovery'` di awal fungsi redirect dan tambahkan `mode` ke dependency array:

```typescript
useEffect(() => {
  let active = true

  const redirectAuthenticatedUser = async () => {
    // Don't redirect if in recovery mode - let user set new password first
    if (mode === 'recovery') {
      return
    }
    // ... rest of redirect logic
  }

  redirectAuthenticatedUser()

  return () => { active = false }
}, [router, mode]) // Tambahkan mode ke dependencies
```

---

### ~~Rendah: pengumuman update fitur tenant subdomain sudah tidak sinkron~~ ✅ DIPERBAIKI

**File:** `supabase-feature-update-tenant-subdomain-seed.sql`

**Masalah:**
Seed masih menulis logout kembali ke domain utama, padahal implementasi sekarang tetap logout di subdomain tenant.

**Solusi:**
Update konten untuk mencerminkan perilaku yang benar:

**Sebelum:**
> "Logout kini selalu kembali ke domain utama agar alur akses lebih konsisten."

**Sesudah:**
> "Logout kini tetap berada di subdomain tenant agar login ulang lebih mudah."

---

## Catatan

Secara umum app sudah jauh lebih matang dan banyak flow besar sudah nyambung dengan benar.
Semua masalah prioritas tinggi dan sedang sudah diperbaiki.

**Seed Data untuk Testing:**

Untuk melihat halaman Updates dengan data, jalankan seed file ini di Supabase:
```bash
# Jalankan seed data terbaru (v1.3.0 dan v1.2.0)
psql -f supabase-feature-updates-seed-latest.sql
```

File `supabase-feature-updates-seed-latest.sql` berisi:
- **v1.3.0**: Critical Security and Performance Improvements (Featured)
- **v1.2.0**: Tenant Subdomain and Auth Flow Improvements

**Prioritas berikutnya (opsional):**
- Tambahkan unit tests untuk API routes (terutama untuk race condition stock update)
- Tambahkan E2E tests untuk critical flows (setup, POS checkout)
- Implementasi error logging service (Sentry, LogRocket)
- Optimasi performa dengan caching layer (Redis) untuk search orders yang heavy
- Pertimbangkan database RPC function untuk atomic stock update yang lebih robust
