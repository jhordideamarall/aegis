'use client'

import { useEffect, useState, useRef } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: { type: string; payload: Record<string, unknown> }
  actionStatus?: 'pending' | 'confirmed' | 'cancelled'
}

function formatText(text: string) {
  if (!text) return null
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-slate-950">{part.slice(2, -2)}</strong>
    }
    const italicParts = part.split(/(\*.*?\*)/g)
    if (italicParts.length > 1) {
      return italicParts.map((ip, j) => {
        if (ip.startsWith('*') && ip.endsWith('*')) {
          return <em key={`${i}-${j}`} className="italic text-slate-800">{ip.slice(1, -1)}</em>
        }
        return <span key={`${i}-${j}`}>{ip}</span>
      })
    }
    return <span key={i}>{part}</span>
  })
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
  action,
  status,
  onConfirm,
  onCancel
}: {
  action: { type: string; payload: Record<string, unknown> }
  status: 'pending' | 'confirmed' | 'cancelled'
  onConfirm: () => void
  onCancel: () => void
}) {
  const labels: Record<string, string> = {
    update_product: '📝 Update Produk',
    update_stock: '📦 Update Stok',
    delete_product: '🗑️ Hapus Produk',
    update_member: '👤 Update Member',
    delete_member: '🗑️ Hapus Member',
    update_settings: '⚙️ Update Settings'
  }

  const label = labels[action.type] || action.type
  const isDestructive = action.type.startsWith('delete_')

  if (status === 'confirmed') {
    return (
      <div className="mt-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-[11px] font-bold text-green-600 uppercase tracking-widest">
        ✓ Berhasil dieksekusi
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="mt-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        Dibatalin
      </div>
    )
  }

  return (
    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{label}</span>
        <div className="flex gap-1.5">
          <button
            onClick={onCancel}
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg text-white transition-colors ${
              isDestructive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-slate-900 hover:bg-slate-700'
            }`}
          >
            Confirm
          </button>
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

export function GlobalCommand() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Load conversation history from DB on first open
  useEffect(() => {
    if (!open || historyLoaded) return
    getClientAuthHeaders()
      .then(headers => fetch('/api/ai/quick-chat', { headers }))
      .then(r => r.json())
      .then(data => {
        if (data.messages?.length > 0) {
          setMessages(data.messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
            role: m.role,
            content: m.content
          })))
        }
        setHistoryLoaded(true)
      })
      .catch(() => setHistoryLoaded(true))
  }, [open, historyLoaded])

  const handleConfirmAction = async (msgIndex: number) => {
    const msg = messages[msgIndex]
    if (!msg.action) return

    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, actionStatus: 'confirmed' } : m
    ))

    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/ai/action', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: msg.action.type, payload: msg.action.payload })
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(prev => prev.map((m, i) =>
          i === msgIndex ? { ...m, actionStatus: 'pending' } : m
        ))
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Waduh gagal nih 💀: ${data.error}`
        }])
      }
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === msgIndex ? { ...m, actionStatus: 'pending' } : m
      ))
    }
  }

  const handleCancelAction = (msgIndex: number) => {
    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, actionStatus: 'cancelled' } : m
    ))
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Oke, dibatalin. Kalau mau dieksekusi lagi bilang aja.'
    }])
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/quick-chat', {
        method: 'POST',
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prompt: userMessage })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'API Request failed: ' + res.statusText)
      }
      if (!res.body) throw new Error('No stream body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let rawContent = ''
      let buffer = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue
          if (trimmedLine.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmedLine.slice(6))
              rawContent += json.choices[0]?.delta?.content || ''
              const { text } = parseAction(rawContent)
              setMessages(prev => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, content: text }]
              })
            } catch {
              // ignore
            }
          }
        }
      }

      // After stream ends, parse action if any
      const { text, action } = parseAction(rawContent)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), {
          ...last,
          content: text,
          action,
          actionStatus: action ? 'pending' : undefined
        }]
      })

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Coba bentar lagi ya'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Waduh error nih 💀: ${msg}`
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0 transition-opacity duration-300 ease-out ${animating ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      <div className={`relative w-full max-w-[600px] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100/50 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        animating ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.96] opacity-0'
      }`}>

        {messages.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto px-5 sm:px-6 pt-6 pb-4 space-y-6 scroll-smooth no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
                {m.role === 'user' ? (
                  <p className="text-[17px] font-medium tracking-tight text-slate-500 leading-snug whitespace-pre-wrap">
                    {formatText(m.content)}
                  </p>
                ) : (
                  <div className="text-[15px] font-medium leading-[1.6] text-slate-900 mt-1 whitespace-pre-wrap">
                    {m.content ? formatText(m.content) : (
                      <span className="opacity-40 italic tracking-widest text-[10px] uppercase">Thinking</span>
                    )}
                    {m.action && m.actionStatus && (
                      <ActionCard
                        action={m.action}
                        status={m.actionStatus}
                        onConfirm={() => handleConfirmAction(i)}
                        onCancel={() => handleCancelAction(i)}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}

        <form onSubmit={handleSubmit} className={`relative flex items-center px-5 sm:px-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${messages.length > 0 ? 'h-16 border-t border-slate-100/60 bg-slate-50/50' : 'h-16'}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={messages.length > 0 ? 'Ask a follow up...' : 'Ask Aegis anything...'}
            disabled={loading}
            className={`flex-1 bg-transparent border-none text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-400 disabled:opacity-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              messages.length > 0 ? 'text-[15px] font-medium' : 'text-[17px] font-medium tracking-tight'
            }`}
          />
          {loading && (
            <div className="ml-4 shrink-0 flex gap-1 opacity-40">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
