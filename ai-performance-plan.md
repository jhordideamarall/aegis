# AI Performance Improvement Plan
## AEGIS POS - Semantic Memory + Context Optimization

---

## 1. Executive Summary

**Goal:** Membuat AI yang:
1. Responsive - response cepat tanpa timeout
2. Memory - ingat percakapan dan fakta penting
3. Wise - Clarifying sebelum menjawab, bukan sok tau

**Problem Saat Ini:**
- Context size: ~40K tokens per request (terlalu besar)
- Database queries: 10+ heavy queries per request
- No memory: AI lupa yang sudah dibicarakan
- Slow first response: 3-10 detik
- Sering timeout
- AI sok tau - langsung jawab tanpa Tanya detail

**Solusi:**
- Semantic memory system (~500-2000 tokens vs 40K)
- Conversation memory (AI inget semua chat)
- Optimize business context (cuma perlu, bukan semua)
- Clarification system - AI Tanya dulu kalau belum jelas
- Keep existing model (OpenRouter free)

---

## 1.1 AI Behavior Philosophy - Wise, Not Smart

### Sebelum (Masalah):
```
User: "Bagaimana bisnis saya?"
AI: langsung jawab panjang lebar
    "Revenue Rp 15.2 juta, produk terjual 124 items, 
    member 47 orang, order 89 transaksi..."

- AI mengasumsikan tau yang user mau tau
- Jawaban terlalu umum, tidak spesifik
- User belum tentu butuh semua info itu
```

### Sesudah (Wise):
```
User: "Bagaimana bisnis saya?"

AI yang wise:
"Mana yang ingin kamu tau? 
- Keuangan (revenue, profit)
- Produk (terlaris, stok)
- Pelanggan (member, aktivitas)
Atau semua?"

User: "Revenue aja"

AI: "Oke, revenue bulan ini Rp 15.2 juta. 
Mau tau perbandingannya sama bulan lalu?"
```

### Prinsip AI Wise:
- JANGAN langsung dumping semua info
- TANYA dulu kalau belum jelas
- FOKUS ke yang user minta
- Tanya clarification kalau ada beberapa interpretasi
- Beri pilihan, bukan asumsi

---

## 1.2 Clarification System Details

### Kapan AI Harus Tanya?

| Tipe Input | Contoh | Respons AI |
|------------|--------|------------|
| **Terlalu umum** | "Bagaimana bisnis?", "Laporan" | Tanya: "Yang mana конкрет?" |
| **Ambiguous** | "Produk", "Uang" | Tanya: "Produk yang mana?" |
| **Multiple meaning** | "Bagaimana performa?" | Tanya: "Performa yang mana?" |

### Implementation:

**1. System Prompt Tambahan:**
```typescript
const WISE_PROMPT = `
## Cara Menjawab - WISE Principle

- JANGAN langsung dumping semua info yang kamu tau
- TANYA dulu kalau belum jelas yang user mau
- FOKUS ke yang user minta, tambahanin hanya kalau benar-benar RELEVAN
- Kalau ada beberapa interpretasi → Tanya clarify dulu
- Beri PILIHAN, jangan ASUMSI

## Contoh Gaya Wise:

User: "Laporan"
AI: "Laporan yang mana? 📝
- Penjualan/Transaksi
- Produk
- Member
- Keuangan"

User: "Produk"
AI: "Produk yang mau dicek apa?
- Terlaris
- Stok menipis
- Semua produk"
`

## Intent Classification - Tambahan:
const intents = [
  // ... existing intents ...
  'clarification_needed',  // NEW - untuk when user too vague
]
```

**2. Clarification Logic:**
```typescript
function shouldAskClarification(userInput: string): boolean {
  const vagueWords = [
    'laporan', 'bagaimana', 'apa', 'produk', 'uang',
    'bisnis', 'performa', 'keuangan', 'penjualan'
  ]
  
  const isShort = userInput.split(' ').length < 3
  const isVague = vagueWords.some(w => 
    userInput.toLowerCase().includes(w)
  )
  
  return isVague && isShort
}
```

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      PROPOSED SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  USER INPUT                                                  │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Local Detection │    │ Intent Class   │                 │
│  │ (commands.ts)   │    │ (automate)      │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
│           └─────────────────────┬┘                         │
│                                 ▼                           │
│              ┌────────────────────────────┐                │
│              │   SMART CONTEXT BUILDER   │                │
│              │  ┌────────────────────────┐│                 │
│              │  │ Semantic Memory       ││  ← NEW         │
│              │  │ (business facts)      ││                 │
│              │  ├────────────────────────┤│                 │
│              │  │ Conversation Summary  ││  ← NEW         │
│              │  │ (chat history)       ││                 │
│              │  ├────────────────────────┤│                 │
│              │  │ Business Context Lite││  ← OPTIMIZED   │
│              │  │ (key data only)      ││                 │
│              │  └────────────────────────┘│                 │
│              └────────────┬──────────────┘                │
│                             ▼                              │
│              ┌────────────────────────────┐                │
│              │      LLM (OpenRouter)     │                │
│              │   (existing, same model)  │                │
│              └────────────┬──────────────┘                │
│                             ▼                              │
│              ┌────────────────────────────┐                │
│              │   Action Executor         │                │
│              │   (existing, reuse)       │                │
│              └────────────────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Components Breakdown

### A. Database Schema (New)

**File Baru:** `apps/web/src/app/api/ai/memory/` (routes untuk memory management)

```sql
-- Tabel 1: Business Semantic Memory
CREATE TABLE business_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL,  -- 'product', 'member', 'trend', 'alert', 'insight'
  key_name TEXT NOT NULL,     -- e.g., "revenue_this_month"
  content TEXT NOT NULL,     -- e.g., "Rp 15.200.000, naik 12% dari bulan lalu"
  importance TEXT DEFAULT 'medium',  -- 'high', 'medium', 'low'
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, memory_type, key_name)
);

-- Tabel 2: Conversation Summary
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,  -- "User sering tanya revenue, fokus produk kopi"
  key_topics JSONB DEFAULT '[]',  -- [{"topic": "revenue", "count": 5}]
  message_count INT DEFAULT 0,
  last_conversation_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel 3: Key Facts (extracted from conversations)
CREATE TABLE conversation_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL,  -- 'preference', 'goal', 'complaint', 'question_pattern'
  content TEXT NOT NULL,
  source_message_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel 4: Clarification Patterns (NEW - untuk AI Tanya yang tepat)
CREATE TABLE clarification_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vague_input TEXT NOT NULL,       -- "produk" 
  common_clarification TEXT NOT NULL,  -- "Produk yang mau dicek apa? Terlaris/Stok/Semua?"
  frequency INT DEFAULT 1,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vague_input)
);

-- Indexes
CREATE INDEX idx_business_memories_user ON business_memories(user_id);
CREATE INDEX idx_conversation_summaries_user ON conversation_summaries(user_id);
CREATE INDEX idx_conversation_facts_user ON conversation_facts(user_id);
```

---

### B. Memory Manager (New)

**File Baru:** `apps/web/src/lib/ai-memory.ts`

```typescript
// Functions needed:
// 1. getSemanticMemories(userId) - load business facts
// 2. getConversationSummary(userId) - load chat summary
// 3. updateSemanticMemory(userId, facts) - save business facts
// 4. updateConversationSummary(userId, messages) - save chat summary
// 5. extractKeyFacts(messages) - AI extracts important info
```

---

### C. Smart Context Builder (Modify Existing)

**File:** `apps/web/src/app/api/ai/chat/route.ts`

**Modifications:**
- Replace `fetchBusinessContext()` dengan `buildSmartContext()`
- Add calls ke memory system
- Reduce data fetched (200 → 10 products, 50 → 20 members, ALL orders → 10)

---

### D. Memory Update System (New)

**File:** `apps/web/src/app/api/ai/memory/update/route.ts`

**Function:**
- Called after each chat completes
- Extracts key facts dari conversation
- Updates semantic memory dan conversation summary
- Runs in background (non-blocking)

---

### E. Optimize Business Context (Modify Existing)

**File:** `apps/web/src/app/api/ai/chat/route.ts`

**Changes:**
```typescript
// Sebelum: fetch 200 products
// Sesudah: fetch top 10 by revenue/stock

// Sebelum: fetch all orders
// Sesudah: fetch last 10 orders only

// Sebelum: calcStats() with 12 months
// Sesudah: current month stats only
```

---

## 4. File Changes Summary

| Action | File | Deskripsi |
|--------|------|-----------|
| CREATE | `apps/web/src/lib/ai-memory.ts` | Memory management functions |
| CREATE | `apps/web/src/app/api/ai/memory/update/route.ts` | Update memory after chat |
| CREATE | `apps/web/src/app/api/ai/memory/route.ts` | Get memory data |
| MODIFY | `apps/web/src/app/api/ai/chat/route.ts` | Use smart context builder |
| MODIFY | `apps/web/src/app/api/ai/quick-chat/route.ts` | Same as above |
| MODIFY | Database | Add new tables |

---

## 5. Implementation Steps

### Step 1: Database Setup (0.5 hari) - DONE
- [x] Create migration for new tables
- [x] Add RLS policies
- [x] Test queries

### Step 2: Memory Manager (1 hari) - DONE
- [x] Create `ai-memory.ts` library
- [x] Implement get/set functions
- [x] Test memory operations

### Step 3: Smart Context Builder + Clarification (1.5 hari) - DONE
- [x] Modify `chat/route.ts`
- [x] Replace fetchBusinessContext with smart version
- [x] Add memory loading
- [x] Update system prompt dengan WISE principle
- [x] Add clarification logic detection
- [x] Test context output

### Step 4: Memory Update System (1 hari) - DONE
- [x] Create update route
- [x] Implement fact extraction logic
- [x] Connect to chat completion
- [x] Test background updates

### Step 5: Optimize Business Context (0.5 hari) - DONE
- [x] Reduce data fetched
- [x] Add pagination/limits
- [x] Test performance

### Step 6: Integration & Testing (1 hari)
- [ ] End-to-end testing
- [ ] Measure response time improvement
- [ ] Verify memory works correctly
- [ ] Bug fixes

---

## 6. Timeline

| Step | Duration | Total |
|------|----------|-------|
| Step 1 | 0.5 hari | 0.5 |
| Step 2 | 1 hari | 1.5 |
| Step 3 | 1 hari | 2.5 |
| Step 4 | 1 hari | 3.5 |
| Step 5 | 0.5 hari | 4.0 |
| Step 6 | 1 hari | 5.0 |

**Total: ~5 hari kerja**

---

## 7. Expected Results

| Metric | Sebelum | Sesudah | Improvement |
|--------|---------|---------|-------------|
| First response time | 3-10 detik | <2 detik | faster |
| Context size | ~40K tokens | ~3K tokens | 93% reduction |
| DB queries per request | 10+ | 3-4 | 60% reduction |
| AI memory | None | Persistent | yes |
| Timeout rate | Tinggi | Tidak ada | fixed |
| AI behavior | Sok tau | Wise/Clarifying | improved |

---

## 7.1 Behavior Changes

### Sebelum:
```
User: "Bagaimana bisnis?"
AI: (langsung dumping semua info)
    "Revenue Rp 15.2 juta, 47 member, 89 transaksi..."
```

### Sesudah:
```
User: "Bagaimana bisnis?"
AI: "Mau tau yangmana dulu? 📊
     - Keuangan (revenue, profit)
     - Produk (terlaris, stok)
     - Pelanggan (member, aktivitas)"
```

### Clarification Examples:

| User Input | AI Wise Response |
|------------|-------------------|
| "Revenue" | Langsung jawab (sudah jelas) |
| "Bagaimana bisnis?" | "Mau tau yang mana specifically?" |
| "Produk" | "Produk yang mana? Terlaris/Stok/Semua?" |
| "Laporan" | "Laporan yang mana? Keuangan/Produk/Member?" |
| "Bagaimana performa?" | "Performa yang aspek? Penjualan/Stok/Member?" |
| "Bagaimana?" | "Yang mana dulu? Keuangan/Produk/Pelanggan?" |

---

## 8. What Remains the Same

- **Model**: Same `z-ai/glm-4.5-air:free` (or can upgrade later)
- **Intent classification**: Same system
- **Action execution**: Same system
- **UI**: Same chat interface
- **Authentication**: Same Supabase auth

---

## 9. Questions/Clarifications Needed

1. **Budget untuk memory storage?** - Json di PostgreSQL cukup murah, tapi perlu monitor
2. **Update frequency?** - Update memory after every message atau batch per conversation?
3. **Data retention?** - Keep memories forever or TTL?

---

## 10. Next Steps

After approval:
1. Execute database migration
2. Create memory library
3. Modify context builder
4. Add update system
5. Test & refine