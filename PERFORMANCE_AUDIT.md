# Performance Audit - AEGIS POS

**Date**: 2026-04-28
**Status**: Complete
**Priority**: High

---

## Executive Summary

App terasa lelet bukan karena repo size (relatively small ~100 files), tapi karena **architecture decisions + data fetching patterns** yang suboptimal. Semua page adalah client components dengan full hydration, dan ada **multiple sequential network calls** di auth flow.

---

## Root Causes Identified

### 1. Auth Flow - Blocking Sequential Requests

**File**: `hooks/useAuth.ts`

```typescript
// Current flow:
1. supabase.auth.getSession()           // Network call #1
2. If no session -> retry 5x with delays // Total ~1.25s wait
3. fetch('/api/businesses/my')          // Network call #2
4. Redirect logic
5. setState() -> re-render
```

**Impact**: Setiap page navigation menunggu ~2-4 seconds sebelum bisa render content.

**Why slow**:
- Session retry loop: `SESSION_RETRY_ATTEMPTS = 5` × `SESSION_RETRY_DELAY_MS = 250` = 1.25s minimum
- Sequential API calls (not parallel)
- No caching of auth state across navigation

### 2. All Pages Are Client Components

**File**: Every page in `app/(app)/*/page.tsx`

```typescript
'use client'  // ← ALL pages marked as client components
```

**Impact**:
- Full React hydration on every page load
- No SSR/SSG benefits
- Larger JavaScript bundle shipped to client

### 3. Multiple Heavy Imports at Root

**Files**:
- `app/layout.tsx` - Imports `Geist` font, `Providers`, `PwaRegistration`
- `app/(app)/layout.tsx` - Imports `useAuth`, `Sidebar`, `PageTransition`, `GlobalCommand`, `DesktopPwaInstallBanner`

**Components loaded on EVERY page**:
- `Sidebar.tsx` - Full component with all nav items
- `GlobalCommand.tsx` - 849 lines! Full markdown parser + command system
- `PageTransition.tsx`
- `DesktopPwaInstallBanner.tsx`
- `usePwaInstall.ts`

### 4. GlobalCommand Component - Massive Bundle

**File**: `components/GlobalCommand.tsx` (849 lines)

```typescript
import ReactMarkdown from 'react-markdown'    // Heavy
import remarkGfm from 'remark-gfm'             // Heavy
import { COMMANDS, detectLocalIntent, ... }    // All AI logic loaded
```

**Impact**: Markdown parser + GFM plugins + AI commands loaded on EVERY page, even if user never opens Cmd+K.

### 5. Dashboard - Multiple Sequential Fetches

**File**: `app/(app)/dashboard/page.tsx`

```typescript
// Pattern: useEffect with sequential calls
useEffect(() => {
  if (!loading && business) {
    fetchDashboard()  // Single API call
  }
}, [loading, business, ...])
```

**Issue**: Data fetch waits for auth to complete first (loading → false → business available), creating sequential dependency chain.

### 6. POS Page - Heavy on Initial Load

**File**: `app/(app)/pos/page.tsx` (624 lines)

```typescript
// Imports analysis (sample):
import ReceiptPrinter from '@/components/ReceiptPrinter'  // Loaded even if not printing
import { Bar, BarChart, ... } from 'recharts'                 // If used
```

**Issues**:
- ReceiptPrinter loaded even if not printing
- Large payment calculation logic on every render
- State updates trigger re-renders

### 7. No Code Splitting

**No dynamic imports found** across the codebase. Components that could be lazy-loaded:
- ReceiptPrinter
- GlobalCommand (Cmd+K modal)
- AI chat components
- Dashboard charts

### 8. API Route Complexity

**File**: `app/api/dashboard/route.ts`

```typescript
// Multiple sequential queries in dashboard API
const [ordersCurrent, ordersPrev, newMembers, ...] = await Promise.all([...])
// But also has complex date parsing logic
```

**Potential optimization**: Add database indexes on `created_at`, `business_id`.

---

## Performance Profile by Page

| Page | Initial Load | After Auth | Notes |
|------|-------------|------------|-------|
| **POS** | ~3-5s | ~1s | Heavy imports, receipt printer loaded |
| **Dashboard** | ~3-5s | ~1s | Waits for auth, then fetches |
| **Orders** | ~3-5s | ~1s | Similar pattern |
| **Members** | ~3-5s | ~1s | Similar pattern |
| **AI Chat** | ~3-5s | ~1s | Additional chunk loaded |

**First Contentful Paint estimated**: 3-5 seconds (blocked by auth)

---

## Recommendations - Priority Order

### 🔴 Critical (Do First)

#### 1. Cache Auth State
```typescript
// In useAuth.ts - add localStorage cache
const cachedBusiness = localStorage.getItem('aegis_business_cache')
if (cachedBusiness && !isExpired(cachedBusiness)) {
  return JSON.parse(cachedBusiness)
}
```
**Expected improvement**: 500ms-1s faster per page

#### 2. Parallelize Auth + Initial Data Fetch
```typescript
// Instead of sequential:
useEffect(() => {
  if (!loading && business) {
    fetchDashboard()
  }
}, [loading, business, ...])

// Use cached business immediately:
const cachedBusiness = getCachedBusiness()
const [business, setBusiness] = useState(cachedBusiness || null)
```
**Expected improvement**: 500ms faster per page

### 🟡 High Priority

#### 3. Lazy Load GlobalCommand
```typescript
// layout.tsx - wrap in dynamic import
const GlobalCommand = dynamic(() => import('@/components/GlobalCommand'), {
  ssr: false,
  loading: () => null
})
```
**Expected improvement**: 200-500ms faster initial load, 100KB less JS on first paint

#### 4. Separate Auth Provider
```typescript
// Create standalone AuthProvider that doesn't block rendering
// Show skeleton/placeholder while auth resolves
```
**Expected improvement**: Better perceived performance, no white screen

### 🟢 Medium Priority

#### 5. Code Split Pages
```typescript
// For pages with heavy dependencies
const ReceiptPrinter = dynamic(() => import('@/components/ReceiptPrinter'))
```

#### 6. Add Database Indexes
```sql
-- Add to supabase/schema.sql or migration
CREATE INDEX idx_orders_business_created ON orders(business_id, created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_products_business ON products(business_id);
```

#### 7. Consider Server Components
```typescript
// dashboard/page.tsx - convert to RSC where possible
export default async function DashboardPage() {
  // Fetch data server-side
  const data = await fetchDashboard()
  return <DashboardClient data={data} />
}
```

---

## Implementation Plan

### Phase 1: Quick Wins (30 minutes)
1. [ ] Add auth state caching in useAuth.ts
2. [ ] Wrap GlobalCommand in dynamic import
3. [ ] Add loading skeleton in app layout

### Phase 2: Data Fetching (1 hour)
1. [ ] Parallelize auth check + initial data fetch
2. [ ] Add SWR for data fetching (already partially done in products page)
3. [ ] Implement stale-while-revalidate

### Phase 3: Code Splitting (1 hour)
1. [ ] Lazy load ReceiptPrinter
2. [ ] Lazy load chart components
3. [ ] Split AI chat components

### Phase 4: Architecture (Long term)
1. [ ] Convert pages to Server Components where possible
2. [ ] Move auth to middleware
3. [ ] Implement proper caching layer

---

## Quick Fix - Immediate (No Refactor)

Add this to `apps/web/src/app/(app)/layout.tsx`:

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import Sidebar from '@/components/Sidebar'
import PageTransition from '@/components/PageTransition'
import dynamic from 'next/dynamic'

// Lazy load GlobalCommand - it's only needed when user opens Cmd+K
const GlobalCommand = dynamic(() => import('@/components/GlobalCommand'), {
  ssr: false,
  loading: () => null
})

// Rest of imports...
```

This single change could improve initial load time by 200-500ms.

---

## Metrics to Track

| Metric | Current (Est) | Target | Tool |
|--------|---------------|--------|------|
| FCP | ~3-5s | <1.5s | Lighthouse |
| LCP | ~4-6s | <2.5s | Lighthouse |
| TTI | ~5-7s | <3.5s | Lighthouse |
| Bundle Size | ~500KB+ | <300KB | next bundle analyzer |

---

## Conclusion

App slow because of **auth blocking + no code splitting**, not repo size. Quick fix: lazy load GlobalCommand. Better fix: restructure auth flow + add proper caching.

**Recommended next step**: Apply Phase 1 quick wins, measure improvement with Lighthouse.