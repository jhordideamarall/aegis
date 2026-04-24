'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, ArrowUp } from 'lucide-react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { useAuth } from '@/hooks/useAuth'
import { HistoryTooltip } from '../components/HistoryTooltip'
import { OutputRenderer } from '../components/OutputRenderer'

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
        {Object.entries(action.payload).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-[11px]">
            <span className="text-slate-400 font-medium w-20 shrink-0">{k}</span>
            <span className="text-slate-700 font-medium truncate">{String(v)}</span>
          </div>
        ))}
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
  const time = h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam'
  const firstName = name?.split(' ')[0] || 'kamu'
  return `${time}, ${firstName} 👋`
}

function RotatingSuggestion() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % SUGGESTIONS.length)
        setVisible(true)
      }, 350)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <p
      className="text-slate-400 text-[14px] transition-all duration-350"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(5px)' }}
    >
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasMessages = messages.length > 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Pre-warm context cache on mount
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
    const data = await res.json()
    if (data.messages) {
      setMessages(data.messages.map((m: { role: 'user' | 'assistant'; content: string }) => {
        const { text, action } = parseAction(m.content)
        return { role: m.role, content: text, action, actionStatus: action ? 'confirmed' : undefined }
      }))
    }
  }, [])


  const handleNew = () => {
    setConversationId(null)
    setMessages([])
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleConfirmAction = async (idx: number) => {
    const msg = messages[idx]
    if (!msg.action) return
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, actionStatus: 'confirmed' } : m))
    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/ai/action', {
        method: 'POST', headers,
        body: JSON.stringify({ type: msg.action!.type, payload: msg.action!.payload })
      })
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

  const handleSubmit = async () => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Add user message + empty assistant message immediately (shows thinking dots right away)
    setMessages(prev => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: '' }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ conversationId: conversationId ?? undefined, prompt })
      })
      if (!res.ok || !res.body) throw new Error('Stream failed')

      // Read conversationId from response header
      const newConvId = res.headers.get('X-Conversation-Id')
      if (newConvId && !conversationId) {
        setConversationId(newConvId)
        setRefreshTrigger(n => n + 1)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let rawContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6))
              rawContent += json.choices[0]?.delta?.content || ''
              const { text } = parseAction(rawContent)
              setMessages(prev => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, content: text }]
              })
            } catch { /* ignore */ }
          }
        }
      }

      const { text, action } = parseAction(rawContent)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), { ...last, content: text, action, actionStatus: action ? 'pending' : undefined }]
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Coba lagi ya'
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          return [...prev.slice(0, -1), { ...last, content: `Error: ${msg}` }]
        }
        return [...prev, { role: 'assistant', content: `Error: ${msg}` }]
      })
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Bar */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-5 shrink-0 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <HistoryTooltip
          activeId={conversationId}
          onSelect={loadConversation}
          onNew={handleNew}
          refreshTrigger={refreshTrigger}
        />
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">

        {/* Messages list */}
        <div className="absolute inset-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 pt-6 pb-36 space-y-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[76%] bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
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
                      <>
                        <OutputRenderer content={m.content} />
                        <span className="inline-block w-[2px] h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                      </>
                    ) : (
                      <>
                        <OutputRenderer content={m.content} />
                        {m.action && m.actionStatus && (
                          <ActionCard
                            action={m.action}
                            status={m.actionStatus}
                            onConfirm={() => handleConfirmAction(i)}
                            onCancel={() => handleCancelAction(i)}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer group — greeting above, composer below. Centered when empty, bottom when chat. */}
        <div
          className="absolute left-0 right-0 px-5 z-20 pointer-events-none"
          style={{
            bottom: hasMessages ? 0 : 'calc(50% - 80px)',
            transition: 'bottom 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            background: hasMessages ? 'linear-gradient(to top, white 65%, rgba(255,255,255,0.95) 85%, transparent)' : 'none',
            paddingBottom: hasMessages ? '20px' : '0',
            paddingTop: hasMessages ? '40px' : '0',
          }}
        >
          <div className="w-full max-w-2xl mx-auto">
            {/* Greeting — visible when empty only */}
            <div
              className="mb-32 pl-4"
              style={{ opacity: hasMessages ? 0 : 1, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}
            >
              <h1 className="text-[22px] font-semibold text-slate-800 tracking-tight mb-1">
                {business?.pic_name ? getGreeting(business.pic_name) : 'Halo 👋'}
              </h1>
              <RotatingSuggestion />
            </div>

            {/* Composer */}
            <div className="pointer-events-auto">
              <div className={`relative rounded-2xl bg-white transition-all duration-300 shadow-[0_2px_24px_rgba(0,0,0,0.09)] border ${loading ? 'neon-blue-glow' : 'border-slate-200/80 hover:border-slate-300'}`}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); adjustTextarea() }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
                  }}
                  placeholder="Tanya Aegis..."
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
