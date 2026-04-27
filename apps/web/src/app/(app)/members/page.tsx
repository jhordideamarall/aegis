'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { formatIDR } from '@/lib/utils'
import { Member } from '@/lib/types'
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Users, 
  Star, 
  TrendingUp, 
  Trash2, 
  Edit2, 
  Loader2 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function MembersPage() {
  const { business, loading } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [fetching, setFetching] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const isLoading = loading || fetching

  useEffect(() => {
    if (!loading && business) fetchMembers()
  }, [loading, business, searchQuery, page])

  const fetchMembers = async () => {
    if (!business) return
    try {
      const cacheKey = `members:${business.id}:${searchQuery}:${page}`
      const cached = getClientCache<{ data: Member[]; total: number }>(cacheKey)
      if (cached) { setMembers(cached.data); setTotal(cached.total); setFetching(false); } else { setFetching(true); }

      const params = new URLSearchParams({ business_id: business.id, page: String(page), limit: String(limit) })
      if (searchQuery) params.set('q', searchQuery)

      const res = await fetch(`/api/members?${params.toString()}`, { headers: await getClientAuthHeaders() })
      if (res.ok) {
        const result = await res.json()
        setMembers(result.data || [])
        setTotal(result.total || 0)
        setClientCache(cacheKey, { data: result.data || [], total: result.total || 0 })
      }
    } catch (error) {} finally { setFetching(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this member?')) return
    if (!business) return
    try {
      const res = await fetch(`/api/members/${id}?business_id=${business.id}`, { method: 'DELETE', headers: await getClientAuthHeaders() })
      if (res.ok) fetchMembers()
    } catch (error) {}
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Members</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Customer Loyalty</p>
        </div>
        <Button onClick={() => { setEditingMember(null); setShowModal(true); }} className="h-9 px-4 rounded-lg font-bold bg-slate-900 text-xs">
          <Plus className="mr-2 h-4 w-4" /> New Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total Members" value={total} icon={Users} />
        <StatsCard title="Total Points" value={members.reduce((s, m) => s + m.points, 0).toLocaleString()} icon={Star} />
        <StatsCard title="Revenue" value={formatIDR(members.reduce((s, m) => s + m.total_purchases, 0))} icon={TrendingUp} />
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Search name or phone..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9 h-9 text-xs bg-white" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-none">
                <TableHead className="py-3 pl-6 text-[10px] uppercase font-bold text-slate-400">Member</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Contact</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Points</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Total Spend</TableHead>
                <TableHead className="text-right pr-6 text-[10px] uppercase font-bold text-slate-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && members.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
              ) : members.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs text-slate-400 font-medium">No members found</TableCell></TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="py-3 pl-6 font-bold text-slate-800 text-sm">{m.name}</TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">{m.phone}</TableCell>
                    <TableCell className="text-xs font-black text-blue-600">{m.points.toLocaleString()} pts</TableCell>
                    <TableCell className="text-xs font-black text-slate-900">{formatIDR(m.total_purchases)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => { setEditingMember(m); setShowModal(true); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600" onClick={() => handleDelete(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {members.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-slate-50/30 border-t">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{startItem}-{endItem} of {total}</p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <div className="h-8 px-3 flex items-center justify-center bg-white border rounded text-[10px] font-black">{page} / {totalPages}</div>
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {showModal && (
        <MemberFormModal
          member={editingMember}
          businessId={business?.id || ''}
          onClose={() => { setShowModal(false); setEditingMember(null); }}
          onSuccess={() => { fetchMembers(); setShowModal(false); setEditingMember(null); }}
        />
      )}
    </div>
  )
}

function StatsCard({ title, value, icon: Icon }: { title: string, value: any, icon: any }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
      <div className="flex items-center justify-between">
        <p className="text-lg font-black text-slate-900">{value}</p>
        <div className="p-1.5 bg-slate-50 rounded-lg"><Icon className="h-4 w-4 text-slate-300" /></div>
      </div>
    </div>
  )
}

function MemberFormModal({ member, businessId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({ name: member?.name || '', phone: member?.phone || '', email: member?.email || '', points: member?.points || 0 })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = member ? `/api/members/${member.id}` : '/api/members'
      const method = member ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...formData, business_id: businessId })
      })
      if (res.ok) onSuccess()
    } catch (err) {} finally { setLoading(false) }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-widest">{member ? 'Edit Member' : 'New Member'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Phone</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Email (Optional)</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-9 text-xs" />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1 h-9 text-xs font-bold" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-9 text-xs font-bold bg-slate-900" disabled={loading}>{loading ? 'Saving...' : 'Save Member'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
