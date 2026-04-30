# AI Performance Upgrade - Documentation

## Overview

Upgrade ini bertujuan untuk membuat AI di AEGIS POS menjadi:
1. Lebih cepat response (tidak timeout)
2. Punya memory seperti Claude
3. Wise - bertanya dulu sebelum menjawab pertanyaan umum

---

## Apa yang Dibuat/Diubah

### 1. Database Tables (Baru)

File: Supabase migration - `create_ai_memory_tables`

```sql
-- 4 tabel baru:
1. business_memories    - menyimpan fakta penting bisnis
2. conversation_summaries - menyimpan ringkasan percakapan  
3. conversation_facts   - menyimpan fakta dari chat
4. clarification_patterns - menyimpan pattern clarification
```

### 2. Library Files (Baru)

| File | Fungsi |
|------|--------|
| `lib/ai-memory.ts` | Manage memory - get, save, update |
| `lib/ai-smart-context.ts` | Build context + cek clarification |

### 3. API Routes (Baru)

| Route | Fungsi |
|-------|--------|
| `/api/ai/memory` | GET - Ambil memory user |
| `/api/ai/memory/update` | POST - Update memory setelah chat |

### 4. Modify Existing Route

File: `/api/ai/chat/route.ts`
- Ganti context builder ke smart version
- Tambah clarification check sebelum response
- Update system prompt dengan WISE principle
- Auto-update memory setelah conversation

---

## System Prompt Comparison

### Sebelum (Lama)

```typescript
// Di fetchBusinessContext() - dipakai
// Masalah: fetch 200 products, 50 members, ALL orders
// Context size: ~40,000 tokens per request
// Tidak ada memory
// AI sok tau - langsung jawab
```

### Sesudah (Baru)

```typescript
// Di buildSmartContext() - sekarang dipakai
// Lebih ringkas: 10 products, 20 members, 10 orders
// Context size: ~3,000 tokens (93% reduction)
// Ada memory dari database
// AI Wise - tanya dulu kalau belum jelas
```

---

## Files Created/Modified

### Created
- `apps/web/src/lib/ai-memory.ts`
- `apps/web/src/lib/ai-smart-context.ts`
- `apps/web/src/app/api/ai/memory/route.ts`
- `apps/web/src/app/api/ai/memory/update/route.ts`
- `ai-performance-plan.md` (plan document)

### Modified
- `apps/web/src/app/api/ai/chat/route.ts` - utama
  - Added import: `buildSmartContext`, `checkClarification`
  - Added clarification check sebelum streaming
  - Changed: `buildSystemPrompt` → `buildSystemPromptWithSmartContext`
  - Added: memory auto-update di flush()

---

## How It Works

### 1. User Chat Flow

```
User Input
    │
    ▼
Check: perlu clarification?
    │
    ├── YA (vague) ──► Return clarification prompt (non-streaming)
    │
    └── TIDAK ──► Build smart context + LLM → Stream response
                      │
                      ▼
                 After stream ──► Update memory (background)
```

### 2. Clarification Examples

| User Input | AI Response |
|------------|--------------|
| "Bagaimana bisnis?" | "Mana yang ingin kamu tau? Keuangan / Produk / Pelanggan" |
| "Laporan" | "Laporan yang mana? Keuangan / Produk / Member" |
| "Revenue" | Langsung jawab (sudah jelas) |

---

## Features Implemented

| Feature | Status | Note |
|---------|--------|------|
| Smart Context Builder | ✅ | Context lebih kecil |
| Semantic Memory | ✅ | Simpan fakta bisnis |
| Conversation Summary | ✅ | Simpan ringkasan chat |
| Clarification System | ✅ | AI tanya dulu |
| WISE System Prompt | ✅ | Prinsip wise |
| Auto Memory Update | ✅ | Background update |

---

## What's Not Changed

- Model LLM tetap sama (`z-ai/glm-4.5-air:free`)
- Intent classification system tetap sama
- Action execution tetap sama
- UI chat tetap sama

---

## Testing Notes

- Rate limit: 50 requests/hari untuk free model
- Perlu login untuk test (auth required)

---

## Next Steps (Optional)

1. Upgrade ke paid model untuk lebih banyak quota
2. Tambah vector search untuk semantic retrieval
3. Enhance memory extraction logic
4. Add user preference learning

---

## Author
Jhordi Deamarall - SocialBrand1980

## Date
April 2026