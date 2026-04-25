'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, ArrowUp } from 'lucide-react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { useAuth } from '@/hooks/useAuth'
import { HistoryTooltip } from '../components/HistoryTooltip'
import { OutputRenderer } from '../components/OutputRenderer'
import { COMMANDS, CommandDef, FieldDef, detectLocalIntent, resolvePronoun, parseIDNumber, fmt } from '@/lib/ai/commands'
import { useAutomation } from '@/hooks/useAutomation'

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: { type: string; payload: Record<string, unknown> }
  actionStatus?: 'pending' | 'confirmed' | 'cancelled'
}

function parseAction(content: string): { text: string; action?: { type: string; payload: Record<string, unknown> } } {
  const match = content.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/)
  if (!match) return { text: content }
  try {
    const action = JSON.parse(match[1].trim())
    const text = content.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/, '').trim()
    return { text, action }
  } catch {
    return { text: content }
  }
}

function ActionCard({
  action, status, onConfirm, onCancel
}: {
  action: { type: string; payload: Record<string, unknown> }
  status: 'pending' | 'confirmed' | 'cancelled'
  onConfirm: () => void
  onCancel: () => void
}) {
  const labels: Record<string, string> = {
    update_product: '📝 Update Produk', update_stock: '📦 Update Stok',
    delete_product: '🗑️ Hapus Produk', update_member: '👤 Update Member',
    delete_member: '🗑️ Hapus Member', update_settings: '⚙️ Update Settings'
  }
  const isDestructive = action.type.startsWith('delete_')
  if (status === 'confirmed') return (
    <div className="mt-3 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-[11px] font-bold text-green-600 uppercase tracking-widest">✓ Berhasil dieksekusi</div>
  )
  if (status === 'cancelled') return (
    <div className="mt-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dibatalin</div>
  )
  return (
    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{labels[action.type] || action.type}</span>
        <div className="flex gap-1.5">
          <button onClick={onCancel} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg text-white transition-colors ${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-700'}`}>Confirm</button>
        </div>
      </div>
      <div className="px-3 py-2 bg-white">
        {Object.entries(action.payload).filter(([k]) => k !== 'id').map(([k, v]) => (
          <div key={k} className="flex gap-2 text-[11px]">
            <span className="text-slate-400 font-medium w-20 shrink-0">{k}</span>
            <span className="text-slate-700 font-medium truncate">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NativeConfirmCard({ automation, onConfirm, onCancel, onSelectMatch }: {
  automation: ReturnType<typeof useAutomation>['pendingAutomation'] & object
  onConfirm: () => void; onCancel: () => void
  onSelectMatch?: (m: { id: string; name: string; [key: string]: unknown }) => void
}) {
  const { intent, params, resolved, multipleMatches, isBulk, bulkItems } = automation
  const isDestructive = intent.startsWith('delete_')

  if (isBulk && bulkItems) {
    const count = bulkItems.length
    return (
      <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2.5 bg-slate-50 flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-slate-700">{`Set poin ${count} member → ${params.points} poin`}</span>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onCancel} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">Batal</button>
            <button onClick={onConfirm} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg text-white bg-slate-900 hover:bg-slate-700 transition-colors">Update Semua</button>
          </div>
        </div>
      </div>
    )
  }

  if (multipleMatches && multipleMatches.length > 1) {
    return (
      <div className="mt-3 border border-amber-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-amber-50">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Beberapa hasil — pilih yang mana?</span>
        </div>
        <div className="px-3 py-2 bg-white space-y-1">
          {multipleMatches.map(m => (
            <button key={m.id} onClick={() => onSelectMatch?.(m)}
              className="w-full text-left px-2.5 py-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <span className="text-[13px] font-medium text-slate-800">{m.name}</span>
              <span className="text-[11px] text-slate-400">
                {m.stock !== undefined && `stok: ${String(m.stock)}`}
                {m.price !== undefined && ` · ${fmt(Number(m.price))}`}
                {m.points !== undefined && `${String(m.points)} poin`}
              </span>
            </button>
          ))}
          <button onClick={onCancel} className="w-full text-center py-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">Batal</button>
        </div>
      </div>
    )
  }

  const name = resolved.name || String(params.product_name || params.member_name || '')
  const description = (() => {
    switch (intent) {
      case 'update_stock': return `Stok ${name}: ${resolved.currentValue ?? '?'} → ${params.stock}`
      case 'update_price': return `Harga ${name}: ${resolved.currentValue !== undefined ? fmt(Number(resolved.currentValue)) : '?'} → ${fmt(Number(params.price))}`
      case 'delete_product': return `Hapus produk "${name}" secara permanen`
      case 'update_member_points': return `Poin ${name}: ${resolved.currentValue ?? '?'} → ${params.points}`
      case 'delete_member': return `Hapus member "${name}" secara permanen`
      case 'update_settings': return `Setting ${params.key} → ${params.value}`
      default: return `Eksekusi ${intent}`
    }
  })()

  return (
    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 bg-slate-50 flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-slate-700 leading-snug">{description}</span>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onCancel} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">Batal</button>
          <button onClick={onConfirm} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg text-white transition-colors ${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-700'}`}>
            {isDestructive ? 'Hapus' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CommandForm({ command, onSubmit, onClose }: {
  command: CommandDef
  onSubmit: (values: Record<string, string>) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => { setTimeout(() => firstInputRef.current?.focus(), 50) }, [])

  const handleSubmit = () => {
    if (command.fields.every(f => values[f.name]?.trim())) onSubmit(values)
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/80">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-bold text-slate-700 uppercase tracking-widest">{command.icon} {command.label}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-[18px] leading-none">×</button>
      </div>
      <div className="space-y-2">
        {command.fields.map((field, idx) => {
          if ('options' in field) {
            return (
              <div key={field.name}>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">{field.label}</label>
                <select
                  ref={idx === 0 ? firstInputRef as React.RefObject<HTMLSelectElement> : undefined}
                  value={values[field.name] || ''}
                  onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  className="w-full text-[14px] font-medium text-slate-900 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 transition-colors bg-white"
                >
                  <option value="">Pilih...</option>
                  {(field as { options: string[] }).options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )
          }
          const f = field as { name: string; label: string; placeholder: string; type?: string }
          return (
            <div key={f.name}>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">{f.label}</label>
              <input
                ref={idx === 0 ? firstInputRef as React.RefObject<HTMLInputElement> : undefined}
                type="text"
                inputMode={f.type === 'number' ? 'numeric' : 'text'}
                value={values[f.name] || ''}
                onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder={f.placeholder}
                className="w-full text-[14px] font-medium text-slate-900 placeholder:text-slate-300 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 transition-colors bg-white"
              />
            </div>
          )
        })}
        <button
          onClick={handleSubmit}
          disabled={!command.fields.every(f => values[f.name]?.trim())}
          className="w-full mt-1 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-bold uppercase tracking-widest hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Jalankan
        </button>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Mau ngecek performa bisnis hari ini?',
  'Stok produk mana yang hampir habis?',
  'Siapa member dengan poin terbanyak?',
  'Revenue bulan ini naik atau turun?',
  'Produk terlaris minggu ini apa?',
  'Ada transaksi yang mencurigakan?',
]

function getGreeting(name: string) {
  const h = new Date().getHours()
  const firstName = name?.split(' ')[0] || 'kamu'
  if (h < 6) return `Masih begadang, ${firstName}? 🌙`
  if (h < 11) return `Pagi, ${firstName} ☀️`
  if (h < 15) return `Siang, ${firstName} 👋`
  if (h < 19) return `Sore, ${firstName} 🌤`
  return `Malam, ${firstName} 🌙`
}

function RotatingSuggestion() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIndex(i => (i + 1) % SUGGESTIONS.length); setVisible(true) }, 350)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <p className="text-slate-400 text-[14px] transition-all duration-350" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(5px)' }}>
      {SUGGESTIONS[index]}
    </p>
  )
}

export default function ChatAegisPage() {
  const { business } = useAuth()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashIndex, setSlashIndex] = useState(0)
  const [activeCommand, setActiveCommand] = useState<CommandDef | null>(null)
  // Initial: assume restoring until we know otherwise. Prevents greeting flash on refresh/nav.
  const [restoring, setRestoring] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasMessages = messages.length > 0 || conversationId !== null

  const addMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content }])
    setLoading(false)
  }, [])

  const { pendingAutomation, setPendingAutomation, runAutomation, confirmAutomation, cancelAutomation, selectMatch } = useAutomation({ onMessage: addMessage })

  const filteredCommands = input.startsWith('/')
    ? COMMANDS.filter(c => c.key.startsWith(input.slice(1).toLowerCase()) || c.label.toLowerCase().includes(input.slice(1).toLowerCase()))
    : []

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: loading ? 'instant' : 'smooth' }) }, [messages, loading, pendingAutomation])

  const businessIdRef = useRef<string | undefined>(undefined)
  const restoreCompletedRef = useRef(false)

  // Early mount: if no saved session key exists at all, exit restoring immediately
  useEffect(() => {
    let hasSavedKey = false
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('aegis_chat_last_conv_')) { hasSavedKey = true; break }
    }
    if (!hasSavedKey) setRestoring(false)
  }, [])

  // Write: only fires AFTER restore has run — prevents wiping localStorage on mount
  useEffect(() => {
    if (!restoreCompletedRef.current) return
    const bid = businessIdRef.current
    if (!bid) return
    const key = `aegis_chat_last_conv_${bid}`
    if (conversationId) { localStorage.setItem(key, conversationId) }
    else { localStorage.removeItem(key) }
  }, [conversationId])

  // Restore: runs when auth is ready
  useEffect(() => {
    if (!business?.id) return
    businessIdRef.current = business.id
    restoreCompletedRef.current = true
    const key = `aegis_chat_last_conv_${business.id}`
    const savedId = localStorage.getItem(key)
    if (!savedId) {
      setRestoring(false)
      return
    }
    loadConversation(savedId)
      .catch(() => { localStorage.removeItem(key) })
      .finally(() => { setRestoring(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id])

  useEffect(() => {
    getClientAuthHeaders().then(h => fetch('/api/ai/chat', { headers: h })).catch(() => {})
  }, [])

  const adjustTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
    el.style.overflowY = el.scrollHeight > 140 ? 'auto' : 'hidden'
  }

  const loadConversation = useCallback(async (id: string) => {
    setConversationId(id)
    setMessages([])
    const headers = await getClientAuthHeaders()
    const res = await fetch(`/api/ai/conversations/${id}`, { headers })
    if (!res.ok) {
      setConversationId(null)
      throw new Error('Conversation not found')
    }
    const data = await res.json()
    if (data.messages?.length) {
      setMessages(data.messages.map((m: { role: 'user' | 'assistant'; content: string }) => {
        const { text, action } = parseAction(m.content)
        return { role: m.role, content: text, action, actionStatus: action ? 'confirmed' : undefined }
      }))
    }
  }, [])

  const handleNew = () => {
    setConversationId(null)
    setMessages([])
    setPendingAutomation(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleConfirmAction = async (idx: number) => {
    const msg = messages[idx]
    if (!msg.action) return
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, actionStatus: 'confirmed' } : m))
    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/ai/action', { method: 'POST', headers, body: JSON.stringify({ type: msg.action!.type, payload: msg.action!.payload }) })
      const data = await res.json()
      if (!res.ok) {
        setMessages(prev => prev.map((m, i) => i === idx ? { ...m, actionStatus: 'pending' } : m))
        setMessages(prev => [...prev, { role: 'assistant', content: `Gagal: ${data.error}` }])
      }
    } catch {
      setMessages(prev => prev.map((m, i) => i === idx ? { ...m, actionStatus: 'pending' } : m))
    }
  }

  const handleCancelAction = (idx: number) => {
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, actionStatus: 'cancelled' } : m))
    setMessages(prev => [...prev, { role: 'assistant', content: 'Oke, dibatalin.' }])
  }

  const selectCommand = useCallback((cmd: CommandDef) => {
    setSlashOpen(false)
    setInput('')
    if (cmd.fields.length === 0) {
      setMessages(prev => [...prev, { role: 'user', content: cmd.label }])
      setLoading(true)
      runAutomation(cmd.intent, {})
    } else {
      setActiveCommand(cmd)
    }
  }, [runAutomation])

  const handleCommandSubmit = useCallback(async (values: Record<string, string>) => {
    if (!activeCommand) return
    const { intent } = activeCommand
    const params: Record<string, unknown> = {}
    activeCommand.fields.forEach(f => {
      const val = values[f.name]
      if ('type' in f && (f as FieldDef & { type?: string }).type === 'number') params[f.name] = Number(val)
      else params[f.name] = val
    })
    if (intent === 'check_revenue' && params.period) {
      const map: Record<string, string> = { 'Hari ini': 'today', 'Minggu ini': 'week', 'Bulan ini': 'month', 'Tahun ini': 'year', 'All time': 'all' }
      params.period = map[String(params.period)] || 'today'
    }
    setActiveCommand(null)
    setMessages(prev => [...prev, { role: 'user', content: activeCommand.label }])
    setLoading(true)
    await runAutomation(intent, params)
  }, [activeCommand, runAutomation])

  const handleSubmit = async () => {
    const userInput = input.trim()
    if (!userInput || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setSlashOpen(false)

    // Value correction for pending confirm card
    if (pendingAutomation && !pendingAutomation.isBulk) {
      const normalizedInput = parseIDNumber(userInput)
      const numMatch = normalizedInput.match(/(\d+)\s*(?:(?:aja|saja|deh|dong|ya|yah)\s*)*$/i)
      if (numMatch) {
        const newVal = Number(numMatch[1])
        const isPrice = pendingAutomation.intent === 'update_price'
        const isStock = pendingAutomation.intent === 'update_stock'
        const isPoints = pendingAutomation.intent === 'update_member_points'
        if (isPrice || isStock || isPoints) {
          const paramKey = isPrice ? 'price' : isStock ? 'stock' : 'points'
          setPendingAutomation({ ...pendingAutomation, params: { ...pendingAutomation.params, [paramKey]: newVal } })
          return
        }
      }
    }

    setMessages(prev => [...prev, { role: 'user', content: userInput }])
    setLoading(true)

    // Client-side resolution
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || ''
    const resolvedInput = resolvePronoun(parseIDNumber(userInput), lastAssistantMsg)
    const localIntent = detectLocalIntent(resolvedInput)
    if (localIntent) {
      await runAutomation(localIntent.intent, localIntent.params)
      return
    }

    // Automate AI classify
    const pendingCtx = pendingAutomation
      ? `Sedang pending konfirmasi: ${pendingAutomation.intent} untuk "${pendingAutomation.resolved?.name || ''}" (nilai saat ini: ${pendingAutomation.resolved?.currentValue ?? '-'}).`
      : ''
    let automateHandled = false
    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const promptWithCtx = pendingCtx ? `${pendingCtx}\n\nPerintah user: ${resolvedInput}` : resolvedInput
      const automateRes = await fetch('/api/ai/automate', { method: 'POST', headers, body: JSON.stringify({ prompt: promptWithCtx }) })
      const { intent, params = {} } = await automateRes.json()
      if (intent && intent !== 'unknown' && intent !== 'needs_context') {
        await runAutomation(intent, params)
        automateHandled = true
      }
    } catch { /* fall through */ }

    if (automateHandled) return

    // Full AI chat with conversation history
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ conversationId: conversationId ?? undefined, prompt: pendingCtx ? `${pendingCtx}\n\n${userInput}` : userInput })
      })
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '')
        let errMsg = 'Stream failed'
        try { errMsg = JSON.parse(errText).error ?? errMsg } catch { errMsg = errText || errMsg }
        throw new Error(errMsg)
      }

      const newConvId = res.headers.get('X-Conversation-Id')
      if (newConvId && !conversationId) { setConversationId(newConvId); setRefreshTrigger(n => n + 1) }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let rawContent = '', buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              rawContent += JSON.parse(trimmed.slice(6)).choices[0]?.delta?.content || ''
              const { text } = parseAction(rawContent)
              setMessages(prev => { const last = prev[prev.length - 1]; return [...prev.slice(0, -1), { ...last, content: text }] })
            } catch { /* ignore */ }
          }
        }
      }

      // [CMD] → route through deterministic pipeline (fresh DB lookup, no stale IDs)
      const cmdMatch = rawContent.match(/\[CMD\]([\s\S]*?)\[\/CMD\]/)
      if (cmdMatch) {
        const cleanText = rawContent.replace(/\[CMD\][\s\S]*?\[\/CMD\]/, '').trim()
        setMessages(prev => { const last = prev[prev.length - 1]; return [...prev.slice(0, -1), { ...last, content: cleanText }] })
        const cmdIntent = detectLocalIntent(cmdMatch[1].trim())
        if (cmdIntent) { await runAutomation(cmdIntent.intent, cmdIntent.params); return }
      } else {
        // [ACTION] fallback — only for cases where CMD wasn't used
        const { text, action } = parseAction(rawContent)
        setMessages(prev => { const last = prev[prev.length - 1]; return [...prev.slice(0, -1), { ...last, content: text, action, actionStatus: action ? 'pending' : undefined }] })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Coba lagi ya'
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && !last.content) return [...prev.slice(0, -1), { ...last, content: `Error: ${msg}` }]
        return [...prev, { role: 'assistant', content: `Error: ${msg}` }]
      })
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  if (restoring) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-5 shrink-0 bg-white/80 backdrop-blur-sm sticky top-0 z-10" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Bar */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-5 shrink-0 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <HistoryTooltip activeId={conversationId} onSelect={loadConversation} onNew={handleNew} refreshTrigger={refreshTrigger} />
        <button onClick={handleNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <Plus size={15} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* Messages */}
        <div className="absolute inset-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 pt-20 pb-36 space-y-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[76%] bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="max-w-[90%] text-slate-900 min-w-0">
                    {!m.content && loading && i === messages.length - 1 ? (
                      <div className="flex items-center gap-2 py-2 px-1 text-[13px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                        <span className="ml-1">Aegis sedang berpikir...</span>
                      </div>
                    ) : m.content && loading && i === messages.length - 1 ? (
                      <><OutputRenderer content={m.content} /><span className="inline-block w-[2px] h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" /></>
                    ) : (
                      <>
                        <OutputRenderer content={m.content} />
                        {m.action && m.actionStatus && (
                          <ActionCard action={m.action} status={m.actionStatus} onConfirm={() => handleConfirmAction(i)} onCancel={() => handleCancelAction(i)} />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {pendingAutomation && (
              <div className="flex justify-start">
                <div className="max-w-[90%] w-full">
                  <NativeConfirmCard
                    automation={pendingAutomation}
                    onConfirm={confirmAutomation}
                    onCancel={cancelAutomation}
                    onSelectMatch={selectMatch}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Backdrop — blocks messages scrolling behind composer */}
        {hasMessages && (
          <div className="absolute bottom-0 left-0 right-0 bg-white z-10" style={{ height: '90px' }} />
        )}

        {/* Composer */}
        <div
          className="absolute left-0 right-0 px-5 z-20 pointer-events-none"
          style={{
            bottom: hasMessages ? 0 : 'calc(50% - 80px)',
            transition: 'bottom 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            paddingBottom: hasMessages ? '20px' : '0',
            paddingTop: hasMessages ? '12px' : '0',
          }}
        >
          <div className="w-full max-w-2xl mx-auto">
            <div className="mb-32 pl-4" style={{ opacity: hasMessages ? 0 : 1, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}>
              <h1 className="text-[22px] font-semibold text-slate-800 tracking-tight mb-1">
                {business?.pic_name ? getGreeting(business.pic_name) : 'Halo 👋'}
              </h1>
              <RotatingSuggestion />
            </div>

            <div className="pointer-events-auto">
              {/* Slash command panel */}
              {slashOpen && filteredCommands.length > 0 && (
                <div className="mb-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                  {filteredCommands.map((c, i) => (
                    <button key={c.key} onClick={() => selectCommand(c)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === slashIndex ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                      <span className="text-base">{c.icon}</span>
                      <div>
                        <span className="text-[13px] font-semibold text-slate-800">{c.label}</span>
                        <span className="text-[12px] text-slate-400 ml-2">{c.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Command form */}
              {activeCommand && (
                <div className="mb-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                  <CommandForm command={activeCommand} onSubmit={handleCommandSubmit} onClose={() => setActiveCommand(null)} />
                </div>
              )}

              <div className={`relative rounded-2xl bg-white transition-all duration-300 shadow-[0_2px_24px_rgba(0,0,0,0.09)] border ${loading ? 'neon-blue-glow' : 'border-slate-200/80 hover:border-slate-300'}`}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => {
                    const val = e.target.value
                    setInput(val)
                    adjustTextarea()
                    if (val.startsWith('/')) { setSlashOpen(true); setSlashIndex(0) }
                    else setSlashOpen(false)
                  }}
                  onKeyDown={e => {
                    if (slashOpen && filteredCommands.length > 0) {
                      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredCommands.length - 1)) }
                      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)) }
                      if (e.key === 'Enter') { e.preventDefault(); selectCommand(filteredCommands[slashIndex]); return }
                      if (e.key === 'Escape') { setSlashOpen(false); return }
                    }
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
                  }}
                  placeholder="Tanya Aegis... atau ketik / untuk command"
                  disabled={loading}
                  rows={1}
                  className="w-full bg-transparent resize-none text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-40 leading-relaxed overflow-hidden"
                  style={{ maxHeight: 140, padding: input ? '14px 52px 14px 18px' : '14px 18px', display: 'block' }}
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                  className="absolute right-3 bottom-[9px] w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-700 transition-all duration-200"
                  style={{ opacity: input.trim() ? 1 : 0, transform: input.trim() ? 'scale(1)' : 'scale(0.7)', pointerEvents: input.trim() ? 'auto' : 'none' }}
                >
                  <ArrowUp size={15} />
                </button>
              </div>
              <p className="text-center text-[11px] text-slate-300 mt-2 transition-opacity duration-300" style={{ opacity: hasMessages ? 0 : 1 }}>
                Aegis bisa saja salah. Verifikasi informasi penting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
