# AI Streaming + Reasoning Implementation Plan

## Overview

Implement Claude Code-style streaming animation dengan reasoning display untuk AI chat page.

---

## Current State

| Component | Status |
|-----------|--------|
| Backend streaming | ✅ Works (SSE) |
| Content extraction | ✅ Only `delta.content` extracted |
| Typing indicator | ✅ Bouncing dots (line 886-892) |
| Cursor | ✅ ▍ (static) |
| Reasoning display | ❌ Not implemented |
| Character-by-char animation | ❌ Not implemented |

---

## Goals

1. **Character-by-character animation** - Smooth reveal seperti Claude Code
2. **Reasoning display** - Show AI thinking process
3. **Cursor blink** - ▋ (blinking) selama streaming

---

## Implementation Plan

### Phase 1: Backend - Extract Reasoning

**File:** `apps/web/src/app/api/ai/chat/route.ts`

**Changes:**
- Parse `delta.reasoning` dari OpenRouter response
- Include reasoning dalam SSE response

**Code Location:** Line 109-110

```typescript
// Current
const data = JSON.parse(trimmed.slice(6))
fullContent += data.choices[0]?.delta?.content || ''

// Updated
const data = JSON.parse(trimmed.slice(6))
const content = data.choices[0]?.delta?.content || ''
const reasoning = data.choices[0]?.delta?.reasoning || ''
fullContent += content
// Note: Reasoning akan dikirim terpisah via SSE atau di-end dengan special marker
```

**SSE Format:**
```typescript
data: { type: "content", value: "..." }
data: { type: "reasoning", value: "..." }
data: { type: "done" }
```

---

### Phase 2: Frontend - Update Message Interface

**File:** `apps/web/src/app/(app)/ai/chat/page.tsx`

**Changes:**
- Tambah `reasoning` field di Message interface (line 25-30)
- Update parsing logic untuk extract reasoning dari SSE

**Message Interface:**
```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string  // NEW
  action?: { type: string; payload: Record<string, unknown> }
  actionStatus?: 'pending' | 'confirmed' | 'cancelled'
}
```

---

### Phase 3: Frontend - Character Animation

**File:** `apps/web/src/app/(app)/ai/chat/page.tsx`

**Changes:**
- Add streaming state management
- Implement character-by-character reveal
- Add cursor blink animation

**Implementation:**
```typescript
// State untuk streaming animation
const [streamingText, setStreamingText] = useState('')
const [isStreaming, setIsStreaming] = useState(false)

// useEffect untuk reveal per-karakter
useEffect(() => {
  if (isStreaming && fullContent) {
    let index = 0
    const interval = setInterval(() => {
      if (index <= fullContent.length) {
        setStreamingText(fullContent.slice(0, index))
        index++
      } else {
        clearInterval(interval)
        setIsStreaming(false)
      }
    }, 30) // 30ms per karakter
    return () => clearInterval(interval)
  }
}, [fullContent, isStreaming])
```

**Cursor blink:**
```tsx
{isStreaming && <span className="animate-pulse">▋</span>}
```

---

### Phase 4: Frontend - Reasoning Display

**File:** `apps/web/src/app/(app)/ai/chat/page.tsx`

**Changes:**
- Render reasoning dalam collapsible component
- Different styling (muted, smaller font)

**UI Structure:**
```tsx
{m.reasoning && (
  <div className="reasoning-section">
    <button 
      className="reasoning-toggle"
      onClick={() => toggleReasoning(m.id)}
    >
      <span className="thinking-dots" />
      <span>Thinking</span>
      <span className="chevron">{isExpanded ? '▼' : '▶'}</span>
    </button>
    {isExpanded && (
      <div className="reasoning-content">
        {m.reasoning}
      </div>
    )}
  </div>
)}
```

**Styling:**
```css
.reasoning-section {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 12px;
  color: #64748b;
}

.reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.thinking-dots {
  display: flex;
  gap: 3px;
}

.thinking-dots::before {
  content: '···';
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
```

---

## Configuration

### Animation Timing

| Setting | Value | Description |
|--------|-------|-------------|
| CHAR_DELAY | 30ms | Delay antara setiap karakter |
| CURSOR_BLINK | 500ms | Cursor blink interval |
| THINKING_SHOW | true | Show thinking indicator |

### Reasoning Trigger

| Condition | Action |
|-----------|--------|
| `delta.reasoning` exists | Extract and store |
| Model: nvidia/nemotron-3-nano-omni-30b-a3b-reasoning | Auto-detect |
| Intent-based (database query) | Show "Thinking..." during fetch |

---

## Files Affected

| File | Changes |
|------|---------|
| `apps/web/src/app/api/ai/chat/route.ts` | Extract reasoning from delta |
| `apps/web/src/app/(app)/ai/chat/page.tsx` | Full implementation |

---

## Testing Checklist

- [ ] Backend sends reasoning via SSE
- [ ] Frontend parses and stores reasoning
- [ ] Character animation works smoothly (30ms delay)
- [ ] Cursor blinks during streaming (▋)
- [ ] Reasoning collapsible works
- [ ] No performance issues on mobile

---

## Related Files

- Current streaming: `apps/web/src/app/api/ai/chat/route.ts` (line 70-145)
- Current frontend: `apps/web/src/app/(app)/ai/chat/page.tsx` (line 790-837)
- Typing indicator: `apps/web/src/app/(app)/ai/chat/page.tsx` (line 886-892)
- Cursor: `apps/web/src/app/(app)/ai/chat/page.tsx` (line 895)

---

## Priority Order

1. ✅ Backend - Extract reasoning
2. ✅ Frontend - Store reasoning in Message
3. ✅ Frontend - Character animation
4. ✅ Frontend - Cursor blink
5. ✅ Frontend - Reasoning display (collapsible)