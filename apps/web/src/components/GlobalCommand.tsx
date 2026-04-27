'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: { type: string; payload: Record<string, unknown> }
  actionStatus?: 'pending' | 'confirmed' | 'cancelled'
}

interface AutomationState {
  intent: string
  params: Record<string, unknown>
  resolved: { id?: string; name?: string; currentValue?: number | string; [key: string]: unknown }
  multipleMatches?: Array<{ id: string; name: string; [key: string]: unknown }>
  isBulk?: boolean
  bulkItems?: Array<{ id: string; name: string; [key: string]: unknown }>
}

// --- Slash command definitions ---
type FieldDef =
  | { name: string; label: string; placeholder: string; type?: 'text' | 'number' }
  | { name: string; label: string; options: string[] }

interface CommandDef {
  key: string
  icon: string
  label: string
  description: string
  intent: string
  fields: FieldDef[]
}

const COMMANDS: CommandDef[] = [
  {
    key: 'stok', icon: '', label: 'Update Stok', description: 'Ubah jumlah stok produk',
    intent: 'update_stock',
    fields: [
      { name: 'product_name', label: 'Nama produk', placeholder: 'Pocari Sweat' },
      { name: 'stock', label: 'Stok baru', placeholder: '50', type: 'number' },
    ]
  },
  {
    key: 'harga', icon: '', label: 'Update Harga', description: 'Ubah harga jual produk',
    intent: 'update_price',
    fields: [
      { name: 'product_name', label: 'Nama produk', placeholder: 'Kopi Americano' },
      { name: 'price', label: 'Harga baru (Rp)', placeholder: '15000', type: 'number' },
    ]
  },
  {
    key: 'poin', icon: '', label: 'Update Poin Member', description: 'Set poin member',
    intent: 'update_member_points',
    fields: [
      { name: 'member_name', label: 'Nama member', placeholder: 'Andi' },
      { name: 'points', label: 'Poin baru', placeholder: '100', type: 'number' },
    ]
  },
  {
    key: 'revenue', icon: '', label: 'Cek Revenue', description: 'Lihat pendapatan per periode',
    intent: 'check_revenue',
    fields: [
      { name: 'period', label: 'Periode', options: ['Hari ini', 'Minggu ini', 'Bulan ini', 'Tahun ini', 'All time'] },
    ]
  },
  {
    key: 'produk', icon: '', label: 'Cari Produk', description: 'Cari info produk',
    intent: 'find_product',
    fields: [
      { name: 'query', label: 'Nama produk', placeholder: 'Ketik nama...' },
    ]
  },
  {
    key: 'member', icon: '', label: 'Cari Member', description: 'Cari info member',
    intent: 'find_member',
    fields: [
      { name: 'query', label: 'Nama / no HP', placeholder: 'Ketik nama...' },
    ]
  },
  {
    key: 'stokmin', icon: '', label: 'Stok Menipis', description: 'Lihat produk stok hampir habis',
    intent: 'low_stock_alert',
    fields: []
  },
  {
    key: 'hapus-produk', icon: '', label: 'Hapus Produk', description: 'Hapus produk dari sistem',
    intent: 'delete_product',
    fields: [
      { name: 'product_name', label: 'Nama produk', placeholder: 'Pocari Sweat' },
    ]
  },
  {
    key: 'hapus-member', icon: '', label: 'Hapus Member', description: 'Hapus member dari sistem',
    intent: 'delete_member',
    fields: [
      { name: 'member_name', label: 'Nama member', placeholder: 'Andi' },
    ]
  },
]

// --- Helpers ---
function fmt(n: number) { return `Rp${n.toLocaleString('id-ID')}` }

function formatText(text: string) {
  if (!text) return null
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-slate-700">{children}</li>,
        h1: ({ children }) => <p className="font-semibold text-slate-900 mb-1">{children}</p>,
        h2: ({ children }) => <p className="font-semibold text-slate-900 mb-1">{children}</p>,
        h3: ({ children }) => <p className="font-medium text-slate-800 mb-0.5">{children}</p>,
        code: ({ children }) => <code className="bg-slate-100 text-slate-800 rounded px-1 py-0.5 text-[11px] font-mono">{children}</code>,
        table: ({ children }) => <div className="overflow-x-auto my-1"><table className="text-xs border-collapse w-full">{children}</table></div>,
        th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-medium text-slate-700">{children}</th>,
        td: ({ children }) => <td className="border border-slate-200 px-2 py-1 text-slate-600">{children}</td>,
        a: ({ children }) => <span className="text-blue-600 underline">{children}</span>,
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

function parseAction(content: string): { text: string; action?: { type: string; payload: Record<string, unknown> } } {
  const match = content.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/)
  if (!match) return { text: content }
  try {
    const action = JSON.parse(match[1].trim())
    return { text: content.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/, '').trim(), action }
  } catch { return { text: content } }
}

// --- Inline Command Form ---
function CommandForm({
  command, onSubmit, onClose
}: {
  command: CommandDef
  onSubmit: (values: Record<string, string>) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    setTimeout(() => (firstInputRef.current as HTMLElement)?.focus(), 50)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  const handleSubmit = () => {
    const filled = command.fields.every(f => {
      const val = values[f.name]?.trim()
      return val && val.length > 0
    })
    if (!filled) return
    onSubmit(values)
  }

  return (
    <div className="border-t border-slate-100 bg-white">
      {/* Command header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-slate-800">{command.label}</span>
          <span className="text-[11px] text-slate-400">{command.description}</span>
        </div>
        <button onClick={onClose} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest font-bold">Esc</button>
      </div>

      {/* Fields */}
      <div className="px-5 pb-4 space-y-2">
        {command.fields.map((field, idx) => {
          if ('options' in field) {
            return (
              <div key={field.name}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">{field.label}</label>
                <div className="flex gap-2 flex-wrap">
                  {field.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setValues(v => ({ ...v, [field.name]: opt }))}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                        values[field.name] === opt
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-200 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )
          }
          return (
            <div key={field.name}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">{field.label}</label>
              <input
                ref={idx === 0 ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined}
                type={field.type === 'number' ? 'text' : 'text'}
                inputMode={field.type === 'number' ? 'numeric' : 'text'}
                value={values[field.name] || ''}
                onChange={e => {
                  const val = field.type === 'number' ? e.target.value.replace(/\D/g, '') : e.target.value
                  setValues(v => ({ ...v, [field.name]: val }))
                }}
                onKeyDown={handleKeyDown}
                placeholder={field.placeholder}
                className="w-full text-[14px] font-medium text-slate-900 placeholder:text-slate-300 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 transition-colors bg-slate-50"
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

// --- ActionCard (for quick-chat fallback AI actions) ---
function ActionCard({ action, status, onConfirm, onCancel }: {
  action: { type: string; payload: Record<string, unknown> }
  status: 'pending' | 'confirmed' | 'cancelled'
  onConfirm: () => void; onCancel: () => void
}) {
  const labels: Record<string, string> = {
    update_product: '📝 Update Produk', update_stock: '📦 Update Stok',
    delete_product: '🗑️ Hapus Produk', update_member: '👤 Update Member',
    delete_member: '🗑️ Hapus Member', update_settings: '⚙️ Update Settings'
  }
  const isDestructive = action.type.startsWith('delete_')
  if (status === 'confirmed') return <div className="mt-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-[11px] font-bold text-green-600 uppercase tracking-widest">✓ Berhasil</div>
  if (status === 'cancelled') return <div className="mt-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dibatalin</div>
  return (
    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest shrink-0">{labels[action.type] || action.type}</span>
        <div className="flex gap-1.5">
          <button onClick={onCancel} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">Batal</button>
          <button onClick={onConfirm} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg text-white transition-colors ${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-700'}`}>Confirm</button>
        </div>
      </div>
      <div className="px-3 py-2 bg-white space-y-0.5">
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

// --- NativeConfirmCard ---
function NativeConfirmCard({ automation, onConfirm, onCancel, onSelectMatch }: {
  automation: AutomationState
  onConfirm: () => void; onCancel: () => void
  onSelectMatch?: (m: { id: string; name: string; [key: string]: unknown }) => void
}) {
  const { intent, params, resolved, multipleMatches, isBulk, bulkItems } = automation
  const isDestructive = intent.startsWith('delete_')

  // Bulk confirm UI
  if (isBulk && bulkItems) {
    const count = bulkItems.length
    const description = intent === 'update_member_points'
      ? `Set poin ${count} member → ${params.points} poin`
      : `Bulk ${intent} pada ${count} item`
    return (
      <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2.5 bg-slate-50 flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-slate-700 leading-snug">{description}</span>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onCancel} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">Batal</button>
            <button onClick={onConfirm} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg text-white bg-slate-900 hover:bg-slate-700 transition-colors">
              Update Semua
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Multiple matches — ask user to pick one
  if (multipleMatches && multipleMatches.length > 1) {
    return (
      <div className="mt-2 border border-amber-200 rounded-xl overflow-hidden">
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

  // Single item confirm
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
    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
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

function intentToActionType(intent: string): string {
  return { update_stock: 'update_stock', update_price: 'update_product', delete_product: 'delete_product', update_member_points: 'update_member', delete_member: 'delete_member', update_settings: 'update_settings' }[intent] || intent
}

function buildActionPayload(a: AutomationState): Record<string, unknown> {
  switch (a.intent) {
    case 'update_stock':         return { id: a.resolved.id, stock: Number(a.params.stock) }
    case 'update_price':         return { id: a.resolved.id, price: Number(a.params.price) }
    case 'delete_product':       return { id: a.resolved.id, name: a.resolved.name }
    case 'update_member_points': return { id: a.resolved.id, points: Number(a.params.points) }
    case 'delete_member':        return { id: a.resolved.id, name: a.resolved.name }
    case 'update_settings':      return { key: a.params.key, value: a.params.value }
    default: return {}
  }
}

// --- Main component ---
export function GlobalCommand() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingAutomation, setPendingAutomation] = useState<AutomationState | null>(null)
  const [activeCommand, setActiveCommand] = useState<CommandDef | null>(null)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashIndex, setSlashIndex] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)

  const filteredCommands = input.trim() === '/'
    ? COMMANDS
    : COMMANDS.filter(c => c.key.includes(input.trim().slice(1).toLowerCase()) || c.label.toLowerCase().includes(input.trim().slice(1).toLowerCase()))

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading, pendingAutomation])
  useEffect(() => { if (open && !activeCommand) setTimeout(() => inputRef.current?.focus(), 50) }, [open, activeCommand])

  useEffect(() => {
    if (open) {
      setMessages([]); setPendingAutomation(null); setInput(''); setActiveCommand(null); setSlashOpen(false)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
    } else {
      setAnimating(false)
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (messages.length === 0 && !pendingAutomation) return
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => { setMessages([]); setPendingAutomation(null) }, 60_000)
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current) }
  }, [messages, pendingAutomation])

  // Show slash panel when input starts with /
  useEffect(() => {
    const t = input.trim()
    setSlashOpen(t.startsWith('/') && !t.includes(' '))
    if (t.startsWith('/')) setSlashIndex(0)
  }, [input])

  const ALL_KEYWORDS = new Set(['semua', 'all', 'seluruh', 'daftar', 'list', 'semua produk', 'semua member', 'all member'])

  const searchProducts = useCallback(async (headers: HeadersInit, q: string) => {
    const isAll = ALL_KEYWORDS.has(q.toLowerCase().trim())
    const tryFetch = async (query: string) => {
      const url = query ? `/api/products?q=${encodeURIComponent(query)}&limit=10` : `/api/products?limit=50`
      const res = await fetch(url, { headers })
      return ((await res.json()).data || []) as Array<{ id: string; name: string; stock: number; price: number }>
    }
    if (isAll) return tryFetch('')
    let results = await tryFetch(q)
    if (results.length === 0) {
      for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
        results = await tryFetch(token)
        if (results.length > 0) break
      }
    }
    return results
  }, [])

  const searchMembers = useCallback(async (headers: HeadersInit, q: string) => {
    const isAll = ALL_KEYWORDS.has(q.toLowerCase().trim())
    const tryFetch = async (query: string) => {
      const url = query ? `/api/members?q=${encodeURIComponent(query)}&limit=10` : `/api/members?limit=20`
      const res = await fetch(url, { headers })
      return ((await res.json()).data || []) as Array<{ id: string; name: string; points: number }>
    }
    if (isAll) return tryFetch('')
    let results = await tryFetch(q)
    if (results.length === 0) {
      for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
        results = await tryFetch(token)
        if (results.length > 0) break
      }
    }
    return results
  }, [])

  const resolveFromDB = useCallback(async (intent: string, params: Record<string, unknown>) => {
    const headers = await getClientAuthHeaders()

    // Strict fetch — never returns all records, always filters by name
    const strictFetchProducts = async (q: string) => {
      if (!q.trim()) return []
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=10`, { headers: headers as HeadersInit })
      return ((await res.json()).data || []) as Array<{ id: string; name: string; stock: number; price: number }>
    }
    const strictFetchMembers = async (q: string) => {
      if (!q.trim()) return []
      const res = await fetch(`/api/members?q=${encodeURIComponent(q)}&limit=10`, { headers: headers as HeadersInit })
      return ((await res.json()).data || []) as Array<{ id: string; name: string; points: number }>
    }

    if (['update_stock', 'update_price', 'delete_product'].includes(intent)) {
      const q = String(params.product_name || '')
      let results = await strictFetchProducts(q)
      // Token fallback — try each word if full query misses
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchProducts(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) return null
      return {
        resolved: { id: results[0].id, name: results[0].name, currentValue: intent === 'update_price' ? results[0].price : results[0].stock },
        multipleMatches: results.length > 1 ? results.slice(0, 6) : undefined
      }
    }

    if (intent === 'update_member_points') {
      const q = String(params.member_name || '')
      // Bulk: "semua" / "all" / "seluruh" → update all members
      if (ALL_KEYWORDS.has(q.toLowerCase().trim())) {
        const res = await fetch('/api/members?limit=200', { headers: headers as HeadersInit })
        const allMembers = ((await res.json()).data || []) as Array<{ id: string; name: string; points: number }>
        if (allMembers.length === 0) return null
        return { resolved: { name: 'semua member' }, isBulk: true, bulkItems: allMembers }
      }
      let results = await strictFetchMembers(q)
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchMembers(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) return null
      return {
        resolved: { id: results[0].id, name: results[0].name, currentValue: results[0].points },
        multipleMatches: results.length > 1 ? results.slice(0, 6) : undefined
      }
    }

    if (intent === 'delete_member') {
      const q = String(params.member_name || '')
      // Block bulk delete — too destructive
      if (ALL_KEYWORDS.has(q.toLowerCase().trim())) return null
      let results = await strictFetchMembers(q)
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchMembers(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) return null
      return {
        resolved: { id: results[0].id, name: results[0].name, currentValue: results[0].points },
        multipleMatches: results.length > 1 ? results.slice(0, 6) : undefined
      }
    }

    return { resolved: {}, multipleMatches: undefined }
  }, [])

  const fetchReadIntent = useCallback(async (intent: string, params: Record<string, unknown>): Promise<string> => {
    const headers = await getClientAuthHeaders() as HeadersInit
    if (intent === 'check_revenue') {
      const period = String(params.period || 'today')
      const periodMap: Record<string, string> = { 'hari ini': 'today', today: 'today', 'minggu ini': 'week', week: 'week', 'bulan ini': 'month', month: 'month', 'tahun ini': 'year', year: 'year', 'all time': 'all', all: 'all' }
      const p = periodMap[period.toLowerCase()] || 'today'
      const labels: Record<string, string> = { today: 'Hari Ini', week: '7 Hari Terakhir', month: 'Bulan Ini', year: 'Tahun Ini', all: 'All Time' }
      const now = new Date(), toStr = (d: Date) => d.toISOString().split('T')[0], end = toStr(now)
      let start = end
      if (p === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); start = toStr(d) }
      else if (p === 'month') start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      else if (p === 'year') start = `${now.getFullYear()}-01-01`
      else if (p === 'all') start = '2000-01-01'
      const res = await fetch(`/api/dashboard?startDate=${start}&endDate=${end}`, { headers })
      const d = await res.json()
      return `**Revenue ${labels[p]}**\n${fmt(d.totalSales || 0)} · Profit ${fmt(d.totalNetProfit || 0)} · ${d.totalOrders || 0} order`
    }
    if (intent === 'find_product') {
      const results = await searchProducts(headers, String(params.query || ''))
      if (results.length === 0) return `Produk tidak ditemukan.`
      return results.map(p => `**${p.name}** — ${fmt(p.price)} · Stok: ${p.stock}`).join('\n')
    }
    if (intent === 'find_member') {
      const results = await searchMembers(headers, String(params.query || ''))
      if (results.length === 0) return `Member tidak ditemukan.`
      return (results as Array<{ name: string; points: number; phone?: string; total_purchases?: number }>).map(m =>
        `**${m.name}** — ${m.phone || ''} · ${m.points} poin · ${fmt(m.total_purchases || 0)} total`
      ).join('\n')
    }
    if (intent === 'low_stock_alert') {
      const res = await fetch('/api/products?limit=200', { headers })
      const data = await res.json()
      const low: Array<{ name: string; stock: number }> = (data.data || []).filter((p: { stock: number }) => p.stock <= 5)
      if (low.length === 0) return 'Semua produk stoknya aman 👍'
      return `**Produk stok menipis (≤5):**\n${low.map(p => `- ${p.name}: ${p.stock} sisa`).join('\n')}`
    }
    return 'Tidak ada data.'
  }, [searchProducts, searchMembers])

  const runAutomation = useCallback(async (intent: string, params: Record<string, unknown>) => {
    const readIntents = ['check_revenue', 'find_product', 'find_member', 'low_stock_alert']
    if (readIntents.includes(intent)) {
      const result = await fetchReadIntent(intent, params)
      setMessages(prev => [...prev, { role: 'assistant', content: result }])
      setLoading(false)
      return
    }
    if (intent === 'update_settings') {
      setPendingAutomation({ intent, params, resolved: {} })
      setLoading(false)
      return
    }
    const dbResult = await resolveFromDB(intent, params)
    if (!dbResult) {
      const nameParam = String(params.product_name || params.member_name || '').trim()
      const isAllKeyword = ALL_KEYWORDS.has(nameParam.toLowerCase())
      const name = String(params.product_name || params.member_name || '')
      const errorMsg = isAllKeyword
        ? intent === 'delete_member'
          ? 'Hapus semua member tidak diizinkan. Masukkan nama member yang spesifik.'
          : `Perlu nama yang spesifik — bulk tidak didukung untuk aksi ini.`
        : name
          ? `"${name}" tidak ditemukan. Cek ejaan dan coba lagi.`
          : `Nama produk/member-nya apa?`
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
      setLoading(false)
      return
    }
    setPendingAutomation({ intent, params, resolved: dbResult.resolved, multipleMatches: dbResult.multipleMatches, isBulk: dbResult.isBulk, bulkItems: dbResult.bulkItems })
    setLoading(false)
  }, [fetchReadIntent, resolveFromDB])

  // Handle slash command form submit
  const handleCommandSubmit = useCallback(async (values: Record<string, string>) => {
    if (!activeCommand) return
    const { intent } = activeCommand

    // Build params from form values
    const params: Record<string, unknown> = {}
    activeCommand.fields.forEach(f => {
      const val = values[f.name]
      if ('type' in f && f.type === 'number') params[f.name] = Number(val)
      else params[f.name] = val
    })

    // Map period option label to code
    if (intent === 'check_revenue' && params.period) {
      const map: Record<string, string> = { 'Hari ini': 'today', 'Minggu ini': 'week', 'Bulan ini': 'month', 'Tahun ini': 'year', 'All time': 'all' }
      params.period = map[String(params.period)] || 'today'
    }

    const label = activeCommand.label
    setActiveCommand(null)
    setMessages(prev => [...prev, { role: 'user', content: label }])
    setLoading(true)
    await runAutomation(intent, params)
  }, [activeCommand, runAutomation])

  const selectCommand = useCallback((cmd: CommandDef) => {
    setSlashOpen(false)
    setInput('')
    if (cmd.fields.length === 0) {
      // Run immediately (e.g. stokmin)
      setMessages(prev => [...prev, { role: 'user', content: cmd.label }])
      setLoading(true)
      runAutomation(cmd.intent, {}).catch(() => setLoading(false))
    } else {
      setActiveCommand(cmd)
    }
  }, [runAutomation])

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
    } catch { setMessages(prev => prev.map((m, i) => i === idx ? { ...m, actionStatus: 'pending' } : m)) }
  }

  const handleCancelAction = (idx: number) => {
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, actionStatus: 'cancelled' } : m))
    setMessages(prev => [...prev, { role: 'assistant', content: 'Oke, dibatalin.' }])
  }

  const handleConfirmAutomation = async () => {
    if (!pendingAutomation) return
    const automation = pendingAutomation
    setPendingAutomation(null)

    // Bulk execution
    if (automation.isBulk && automation.bulkItems) {
      const type = intentToActionType(automation.intent)
      const items = automation.bulkItems
      try {
        const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
        let successCount = 0
        let failCount = 0
        for (const item of items) {
          const bulkAutomation = { ...automation, resolved: { id: item.id, name: item.name } }
          const payload = buildActionPayload(bulkAutomation)
          const res = await fetch('/api/ai/action', { method: 'POST', headers, body: JSON.stringify({ type, payload }) })
          if (res.ok) successCount++
          else failCount++
        }
        const msg = failCount === 0
          ? `✓ ${successCount} member berhasil diupdate`
          : `${successCount} berhasil, ${failCount} gagal`
        setMessages(prev => [...prev, { role: 'assistant', content: msg }])
      } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Error saat eksekusi bulk.' }]) }
      return
    }

    // Single execution
    const type = intentToActionType(automation.intent)
    const payload = buildActionPayload(automation)
    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/ai/action', { method: 'POST', headers, body: JSON.stringify({ type, payload }) })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: res.ok ? `✓ ${data.message || 'Berhasil'}` : `Gagal: ${data.error}` }])
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Error saat eksekusi.' }]) }
  }

  const handleCancelAutomation = () => {
    setPendingAutomation(null)
    setMessages(prev => [...prev, { role: 'assistant', content: 'Oke, dibatalin.' }])
  }

  const parseIDNumber = (s: string): string =>
    s.replace(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)\b/gi, (_, n) => String(Math.round(parseFloat(n.replace(',', '.')) * 1000)))
     .replace(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta|m)\b/gi, (_, n) => String(Math.round(parseFloat(n.replace(',', '.')) * 1_000_000)))

  // Client-side intent detection for common CRUD patterns — deterministic, no AI needed
  const detectLocalIntent = (input: string): { intent: string; params: Record<string, unknown> } | null => {
    const s = parseIDNumber(input.trim())

    // verb anchors
    const updateVerb = /(?:update|ubah|ganti|set|jadiin?|tambahin?|kurangi?|coba(?:in)?|bikin?|kasih|pasang|pake)/i
    const valueSep = /(?:jadi(?:in)?|ke|=|menjadi|:\s*|adi|jd)/i
    const stockWord = /(?:stok|stock)/i
    const priceWord = /(?:harga|price)/i
    const pointWord = /(?:poin|points?)/i

    let m: RegExpMatchArray | null

    // stok: "update stok X jadi N" | "stok X jadi N" | "X stoknya N" | "X tinggal N"
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${stockWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(new RegExp(`${stockWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(/(.+?)\s+(?:stoknya|stocknya)\s+(?:jadi|ke|=|menjadi)?\s*(\d+)/i)
      || s.match(/(.+?)\s+tinggal\s+(\d+)\s*(?:pcs|buah|unit|biji)?/i)
    if (m && stockWord.test(s) || (m && /tinggal/i.test(s))) {
      const nm = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${stockWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
        || s.match(/(.+?)\s+(?:stoknya|stocknya)\s+(?:jadi|ke|=|menjadi)?\s*(\d+)/i)
        || s.match(/(.+?)\s+tinggal\s+(\d+)/i)
      if (nm) return { intent: 'update_stock', params: { product_name: nm[1].trim(), stock: Number(nm[2]) } }
    }

    // harga: "update harga X jadi N" | "harga X N" | "X harganya N"
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${priceWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(new RegExp(`${priceWord.source}\\s+(.+?)\\s+(?:sekarang|skrg)?\\s*${valueSep.source}?\\s*(\\d+)`, 'i'))
      || s.match(/(.+?)\s+(?:harganya|pricenya)\s+(?:jadi|ke|=|menjadi)?\s*(\d+)/i)
    if (m && priceWord.test(s)) return { intent: 'update_price', params: { product_name: m[1].trim(), price: Number(m[2]) } }

    // poin: "update poin X jadi N" | "poin X N"
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${pointWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(new RegExp(`${pointWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
    if (m && pointWord.test(s)) return { intent: 'update_member_points', params: { member_name: m[1].trim(), points: Number(m[2]) } }

    // hapus produk
    m = s.match(/(?:hapus|delete|remove|buang|ilangin?)\s+(?:produk\s+)?(.+)/i)
    if (m && !s.match(/\bmember\b/i)) return { intent: 'delete_product', params: { product_name: m[1].trim() } }

    // hapus member
    m = s.match(/(?:hapus|delete|remove|buang|ilangin?)\s+(?:data\s+)?member\s+(.+)/i)
    if (m) return { intent: 'delete_member', params: { member_name: m[1].trim() } }

    return null
  }

  // Resolve "ini"/"itu"/"tadi" pronouns using last assistant message — no AI needed
  const resolvePronoun = (input: string, lastMsg: string): string => {
    if (!lastMsg || !/\b(ini|itu|tadi|yang tadi)\b/i.test(input)) return input
    const patterns = [
      /[-•]\s*([A-Za-z0-9 _\-']+?):\s*\d+\s*sisa/,  // "- Snack Brownie: 0 sisa"
      /\*\*([A-Za-z0-9 _\-']+?)\*\*/,                  // "**Snack Brownie**"
      /`([A-Za-z0-9 _\-']+?)`/,                         // "`Snack Brownie`"
      /id:[a-f0-9-]+\s*\|\s*([^|]+?)\s*\|/,            // "id:xxx | Snack Brownie |"
    ]
    for (const pattern of patterns) {
      const m = lastMsg.match(pattern)
      const name = m?.[1]?.trim()
      if (name && name.length > 1) return input.replace(/\b(ini|itu|tadi|yang tadi)\b/gi, name)
    }
    return input
  }

  const handleSelectMatch = (match: { id: string; name: string; [key: string]: unknown }) => {
    if (!pendingAutomation) return
    const cv = (pendingAutomation.intent === 'update_price' ? match.price : pendingAutomation.intent === 'update_member_points' ? match.points : match.stock) as number
    setPendingAutomation({ ...pendingAutomation, resolved: { id: match.id, name: match.name, currentValue: cv }, multipleMatches: undefined })
  }

  const handleSubmit = async () => {
    const userInput = input.trim()
    if (!userInput || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userInput }])
    setLoading(true)

    // Step 0: if there's a pending confirm card, check if user is correcting the value
    if (pendingAutomation && !pendingAutomation.isBulk) {
      const normalizedInput = parseIDNumber(userInput)
      const numMatch = normalizedInput.match(/(\d+)\s*(?:(?:aja|saja|deh|dong|ya|yah)\s*)*$/i)
      if (numMatch) {
        const newVal = Number(numMatch[1])
        const isPrice = ['update_price'].includes(pendingAutomation.intent)
        const isStock = ['update_stock'].includes(pendingAutomation.intent)
        const isPoints = ['update_member_points'].includes(pendingAutomation.intent)
        if (isPrice || isStock || isPoints) {
          const paramKey = isPrice ? 'price' : isStock ? 'stock' : 'points'
          setPendingAutomation({ ...pendingAutomation, params: { ...pendingAutomation.params, [paramKey]: newVal } })
          setLoading(false)
          return
        }
      }
    }

    // Step 1: resolve pronouns from last assistant message
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || ''
    const resolvedInput = resolvePronoun(userInput, lastAssistantMsg)

    // Step 2: client-side pattern matching — same tools as slash commands, no AI needed
    const localIntent = detectLocalIntent(resolvedInput)
    if (localIntent) {
      await runAutomation(localIntent.intent, localIntent.params)
      return
    }

    // Build pending automation context for AI fallback
    const pendingCtx = pendingAutomation
      ? `Sedang pending konfirmasi: ${pendingAutomation.intent} untuk "${pendingAutomation.resolved?.name || ''}" (nilai saat ini: ${pendingAutomation.resolved?.currentValue ?? '-'}). User mungkin mengoreksi nilai atau memberi instruksi terkait.`
      : ''

    let withContext = false
    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const promptWithCtx = pendingCtx ? `${pendingCtx}\n\nPerintah user: ${resolvedInput}` : resolvedInput
      const automateRes = await fetch('/api/ai/automate', { method: 'POST', headers, body: JSON.stringify({ prompt: promptWithCtx }) })
      const { intent, params = {} } = await automateRes.json()
      if (intent && intent !== 'unknown' && intent !== 'needs_context') {
        await runAutomation(intent, params)
        return
      }
      withContext = intent === 'needs_context'
    } catch { /* fall through */ }

    // Fallback: streaming quick-chat (withContext=true for analytical queries)
    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const chatPrompt = pendingCtx ? `${pendingCtx}\n\n${resolvedInput}` : resolvedInput
      const res = await fetch('/api/ai/quick-chat', { method: 'POST', headers, body: JSON.stringify({ prompt: chatPrompt, withContext }) })
      if (!res.ok || !res.body) throw new Error('Request failed')

      let raw = '', buffer = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          const t = line.trim()
          if (!t || t === 'data: [DONE]') continue
          if (t.startsWith('data: ')) {
            try {
              raw += JSON.parse(t.slice(6)).choices[0]?.delta?.content || ''
              const { text } = parseAction(raw)
              setMessages(prev => { const last = prev[prev.length - 1]; return [...prev.slice(0, -1), { ...last, content: text }] })
            } catch { /* ignore */ }
          }
        }
      }
      const { text, action } = parseAction(raw)
      // Check if AI returned a [CMD] for CRUD routing
      const cmdMatch = raw.match(/\[CMD\]([\s\S]*?)\[\/CMD\]/)
      if (cmdMatch) {
        const cmdText = cmdMatch[1].trim()
        const localIntent = detectLocalIntent(cmdText)
        const cleanText = text.replace(/\[CMD\][\s\S]*?\[\/CMD\]/, '').trim()
        setMessages(prev => { const last = prev[prev.length - 1]; return [...prev.slice(0, -1), { ...last, content: cleanText }] })
        if (localIntent) {
          await runAutomation(localIntent.intent, localIntent.params)
          return
        }
      } else {
        setMessages(prev => { const last = prev[prev.length - 1]; return [...prev.slice(0, -1), { ...last, content: text, action, actionStatus: action ? 'pending' : undefined }] })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Coba lagi'
      setMessages(prev => { const last = prev[prev.length - 1]; return last?.role === 'assistant' && !last.content ? [...prev.slice(0, -1), { ...last, content: `Error: ${msg}` }] : [...prev, { role: 'assistant', content: `Error: ${msg}` }] })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  if (!mounted) return null

  const hasContent = messages.length > 0 || !!pendingAutomation

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0 transition-opacity duration-300 ease-out ${animating ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px]" onClick={() => setOpen(false)} />

      <div className={`relative w-full max-w-[600px] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100/50 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        animating ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.96] opacity-0'
      }`}>

        {/* Slash command panel */}
        {slashOpen && filteredCommands.length > 0 && (
          <div className="border-b border-slate-100 py-1">
            {filteredCommands.map((c, i) => (
              <button key={c.key} onMouseDown={e => { e.preventDefault(); selectCommand(c) }}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${i === slashIndex ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                <span className="text-[12px] font-bold text-indigo-500 w-24 shrink-0 font-mono">/{c.key}</span>
                <span className="text-[13px] font-medium text-slate-700">{c.label}</span>
                <span className="text-[12px] text-slate-400 ml-1">{c.description}</span>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto px-5 sm:px-6 pt-6 pb-4 space-y-5 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {m.role === 'user' ? (
                  <p className="text-[16px] font-medium text-slate-400 leading-snug">{m.content}</p>
                ) : (
                  <div className="text-[15px] font-medium leading-[1.65] text-slate-900 whitespace-pre-wrap">
                    {m.content ? formatText(m.content) : <span className="opacity-30 italic text-[11px] uppercase tracking-widest">Thinking</span>}
                    {m.action && m.actionStatus && (
                      <ActionCard action={m.action} status={m.actionStatus} onConfirm={() => handleConfirmAction(i)} onCancel={() => handleCancelAction(i)} />
                    )}
                  </div>
                )}
              </div>
            ))}
            {pendingAutomation && (
              <div className="animate-in fade-in duration-200">
                <NativeConfirmCard automation={pendingAutomation} onConfirm={handleConfirmAutomation} onCancel={handleCancelAutomation} onSelectMatch={handleSelectMatch} />
              </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}

        {pendingAutomation && messages.length === 0 && (
          <div className="px-5 sm:px-6 pt-5 pb-2">
            <NativeConfirmCard automation={pendingAutomation} onConfirm={handleConfirmAutomation} onCancel={handleCancelAutomation} onSelectMatch={handleSelectMatch} />
          </div>
        )}

        {/* Inline command form OR regular input */}
        {activeCommand ? (
          <CommandForm command={activeCommand} onSubmit={handleCommandSubmit} onClose={() => { setActiveCommand(null); setTimeout(() => inputRef.current?.focus(), 50) }} />
        ) : (
          <div className={`relative flex items-center px-5 sm:px-6 transition-all ${hasContent ? 'h-14 border-t border-slate-100/60 bg-slate-50/40' : 'h-14'}`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (slashOpen) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredCommands.length - 1)) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)) }
                  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (filteredCommands[slashIndex]) selectCommand(filteredCommands[slashIndex]) }
                  else if (e.key === 'Escape') setSlashOpen(false)
                  return
                }
                if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
              }}
              placeholder={hasContent ? 'Ask a follow up...' : 'Tanya Aegis... atau ketik / untuk perintah'}
              disabled={loading}
              className={`flex-1 bg-transparent border-none text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-400 disabled:opacity-40 ${hasContent ? 'text-[15px] font-medium' : 'text-[17px] font-medium tracking-tight'}`}
            />
            {loading && (
              <div className="ml-3 shrink-0 flex gap-1 opacity-40">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
