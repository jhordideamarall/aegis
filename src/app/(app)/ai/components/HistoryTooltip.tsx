'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getClientAuthHeaders } from '@/lib/clientAuth'

interface Conversation {
  id: string
  title: string
  updated_at: string
}

interface Props {
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  refreshTrigger?: number
}

export function HistoryTooltip({ activeId, onSelect, onNew, refreshTrigger }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getClientAuthHeaders()
      .then(h => fetch('/api/ai/conversations', { headers: h }))
      .then(r => r.json())
      .then(d => setConversations(d.conversations || []))
      .finally(() => setLoading(false))
  }, [open, refreshTrigger])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const headers = await getClientAuthHeaders()
    await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE', headers })
    setConversations(prev => prev.filter(c => c.id !== id))
  }

  const relativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m lalu`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}j lalu`
    return `${Math.floor(hrs / 24)}h lalu`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-[11px] font-bold uppercase tracking-widest">
        <Clock size={13} />
        <span>Riwayat</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0 rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Percakapan</span>
          <button
            onClick={() => { onNew(); setOpen(false) }}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Plus size={12} /> Baru
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-6 text-center text-[11px] text-slate-300 font-medium">Memuat...</div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-6 text-center text-[11px] text-slate-300 font-medium">Belum ada percakapan</div>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); setOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0 ${activeId === c.id ? 'bg-slate-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium truncate ${activeId === c.id ? 'text-slate-900' : 'text-slate-600'}`}>{c.title}</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">{relativeTime(c.updated_at)}</p>
                </div>
                <button
                  onClick={e => handleDelete(e, c.id)}
                  className="ml-2 p-1 rounded-lg text-slate-200 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
