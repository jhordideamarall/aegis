'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { 
  Rocket, 
  ChevronRight, 
  Calendar, 
  Tag, 
  Loader2, 
  ArrowLeft 
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface FeatureUpdate {
  id: string
  title: string
  version: string
  summary: string
  content: string
  category: string
  status: string
  published_at: string
  slug: string
}

export default function FeatureUpdatesPage() {
  const { business, loading: authLoading } = useAuth()
  const [updates, setUpdates] = useState<FeatureUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpdates()
  }, [])

  const fetchUpdates = async () => {
    try {
      const cacheKey = 'feature_updates:published'
      const cached = getClientCache<FeatureUpdate[]>(cacheKey)
      if (cached) { setUpdates(cached); setLoading(false); }
      
      const res = await fetch('/api/feature-updates')
      if (res.ok) {
        const data = await res.json()
        setUpdates(data)
        setClientCache(cacheKey, data)
      }
    } catch (error) {} finally { setLoading(false) }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b">
        <h1 className="text-2xl font-bold text-slate-900">What's New</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Latest Updates</p>
      </div>

      <div className="space-y-4">
        {updates.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50 rounded-xl border border-dashed">
            No updates yet
          </div>
        ) : (
          updates.map((update) => (
            <Link key={update.id} href={`/feature-updates/${update.slug}`}>
              <Card className="border-slate-200 hover:border-slate-400 transition-all cursor-pointer group shadow-sm mb-4">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-50 text-[9px] font-black uppercase tracking-tighter h-5 px-2 border-slate-200">
                          v{update.version}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Calendar size={10} /> {new Date(update.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <h2 className="text-base font-black text-slate-800 group-hover:text-slate-900 transition-colors">{update.title}</h2>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{update.summary}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
