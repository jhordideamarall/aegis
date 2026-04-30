'use client'

import { useState } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
}

interface Props {
  suppliers: Supplier[]
  onRefresh: () => void
}

export function SuppliersTab({ suppliers, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete supplier?')) return
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE', headers: await getClientAuthHeaders() })
      if (res.ok) onRefresh()
    } catch (e) { console.error(e) }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="hidden sm:flex items-center gap-6 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Suppliers</p>
            <p className="text-lg font-black text-slate-900">{suppliers.length}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Active</p>
            <p className="text-lg font-black text-emerald-600">{suppliers.filter(s => s.is_active).length}</p>
          </div>
        </div>
        <Button onClick={() => { setEditingSupplier(null); setShowForm(true); }} className="h-10 px-5 rounded-xl font-black uppercase bg-blue-600 text-[10px]">
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <Card className="border-slate-200 rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50/30">
            <TableRow>
              <TableHead className="py-4 pl-6 text-[11px] uppercase font-black text-slate-400">Supplier</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Contact</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Phone</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Email</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Status</TableHead>
              <TableHead className="text-right pr-6 text-[11px] uppercase font-black text-slate-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400 font-bold">No suppliers found</TableCell></TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/50">
                  <TableCell className="py-4 pl-6 font-bold text-slate-800">{s.name}</TableCell>
                  <TableCell className="text-sm text-slate-500">{s.contact_name || '-'}</TableCell>
                  <TableCell className="text-sm text-slate-500">{s.phone || '-'}</TableCell>
                  <TableCell className="text-sm text-slate-500">{s.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-black px-2 py-0.5 text-[10px] uppercase ${s.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingSupplier(s); setShowForm(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {showForm && (
        <SupplierFormModal supplier={editingSupplier} onClose={() => { setShowForm(false); setEditingSupplier(null); }} onSuccess={() => { onRefresh(); setShowForm(false); setEditingSupplier(null); }} />
      )}
    </>
  )
}

interface SupplierFormModalProps {
  supplier: Supplier | null
  onClose: () => void
  onSuccess: () => void
}

function SupplierFormModal({ supplier, onClose, onSuccess }: SupplierFormModalProps) {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact_name: supplier?.contact_name || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    notes: '',
    is_active: supplier?.is_active ?? true
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = supplier ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...await getClientAuthHeaders() }, body: JSON.stringify(formData) })
      if (res.ok) onSuccess()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-widest text-sm">{supplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase">Company Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Supplier name" className="rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase">Contact Person</Label>
            <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} placeholder="Contact name" className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase">Address</Label>
            <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Address" className="rounded-xl" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-xl font-black uppercase text-[10px] bg-blue-600">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {supplier ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}