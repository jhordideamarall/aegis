'use client'

import { useState, useEffect } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { formatIDR } from '@/lib/formatCurrency'
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Edit2, Trash2, Loader2, AlertTriangle } from 'lucide-react'

function formatPriceInput(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

interface RawMaterial {
  id: string
  name: string
  category: string
  unit: string
  cost_per_unit: number
  stock: number
  min_stock_level: number
  supplier_id: string | null
  supplier?: { name: string } | null
}

interface Supplier {
  id: string
  name: string
}

interface Props {
  materials: RawMaterial[]
  suppliers: Supplier[]
  loading: boolean
  onRefresh: () => void
}

export function RawMaterialsTab({ materials, suppliers, loading, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete material?')) return
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE', headers: await getClientAuthHeaders() })
      if (res.ok) onRefresh()
    } catch (e) { console.error(e) }
  }

  const totalValue = materials.reduce((acc, m) => acc + (m.cost_per_unit * m.stock), 0)
  const lowStock = materials.filter(m => m.stock <= m.min_stock_level).length

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="hidden sm:flex items-center gap-6 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Materials</p>
            <p className="text-lg font-black text-slate-900">{materials.length}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Stock Value</p>
            <p className="text-lg font-black text-emerald-600">{formatIDR(totalValue)}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Low Stock</p>
            <p className="text-lg font-black text-rose-600">{lowStock}</p>
          </div>
        </div>
        <Button onClick={() => { setEditingMaterial(null); setShowForm(true); }} className="h-10 px-5 rounded-xl font-black uppercase bg-emerald-600 text-[10px]">
          <Plus className="mr-2 h-4 w-4" /> Add Material
        </Button>
      </div>

      <Card className="border-slate-200 rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50/30">
            <TableRow>
              <TableHead className="py-4 pl-6 text-[11px] uppercase font-black text-slate-400">Material</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Category</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Cost/Unit</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Stock</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Supplier</TableHead>
              <TableHead className="text-right pr-6 text-[11px] uppercase font-black text-slate-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
            ) : materials.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400 font-bold">No materials found</TableCell></TableRow>
            ) : (
              materials.map((m) => (
                <TableRow key={m.id} className="hover:bg-slate-50/50">
                  <TableCell className="py-4 pl-6 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      {m.stock <= m.min_stock_level && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                      {m.name}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-500 font-bold px-2 py-0.5 text-[10px]">{m.category}</Badge></TableCell>
                  <TableCell className="text-sm font-black text-slate-700">{formatIDR(m.cost_per_unit)}/{m.unit}</TableCell>
                  <TableCell><span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${m.stock <= m.min_stock_level ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{m.stock.toLocaleString()} {m.unit}</span></TableCell>
                  <TableCell className="text-sm text-slate-500">{m.supplier?.name || '-'}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingMaterial(m); setShowForm(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600" onClick={() => handleDelete(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {showForm && (
        <MaterialFormModal material={editingMaterial} suppliers={suppliers} onClose={() => { setShowForm(false); setEditingMaterial(null); }} onSuccess={() => { onRefresh(); setShowForm(false); setEditingMaterial(null); }} />
      )}
    </>
  )
}

interface MaterialFormModalProps {
  material: RawMaterial | null
  suppliers: Supplier[]
  onClose: () => void
  onSuccess: () => void
}

function MaterialFormModal({ material, suppliers, onClose, onSuccess }: MaterialFormModalProps) {
  const [formData, setFormData] = useState({
    name: material?.name || '',
    category: material?.category || 'consumable',
    unit: material?.unit || 'ml',
    stock: material?.stock || 0,
    cost_per_unit: material?.cost_per_unit || 0,
    min_stock_level: material?.min_stock_level || 0,
    supplier_id: material?.supplier_id || ''
  })

  const [unitSize, setUnitSize] = useState(250)
  const [qtyBeli, setQtyBeli] = useState(1)
  const [hargaPerUnit, setHargaPerUnit] = useState(0)
  const [hargaPerUnitInput, setHargaPerUnitInput] = useState('')
  const [loading, setLoading] = useState(false)

  const totalBayar = qtyBeli * hargaPerUnit
  const totalStock = qtyBeli * unitSize
  const costPerUnitSize = unitSize > 0 ? Math.round(hargaPerUnit / unitSize) : 0

  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || '',
        category: material.category || 'consumable',
        unit: material.unit || 'ml',
        stock: material.stock || 0,
        cost_per_unit: material.cost_per_unit || 0,
        min_stock_level: material.min_stock_level || 0,
        supplier_id: material.supplier_id || ''
      })
      setUnitSize(1)
      setQtyBeli(material.stock || 1)
      setHargaPerUnit(material.cost_per_unit || 0)
      setHargaPerUnitInput(material.cost_per_unit ? formatPriceInput(material.cost_per_unit) : '')
    }
  }, [material])

  const handleHargaPerUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    const val = parseInt(raw) || 0
    setHargaPerUnit(val)
    setHargaPerUnitInput(raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...formData,
        stock: totalStock,
        cost_per_unit: costPerUnitSize
      }
      const url = material ? `/api/materials/${material.id}` : '/api/materials'
      const method = material ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...await getClientAuthHeaders() }, body: JSON.stringify(payload) })
      if (res.ok) onSuccess()
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold uppercase tracking-widest text-sm">{material ? 'Edit Material' : 'Add Material'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">Nama Material</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: Susu UHT" className="rounded-xl" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Kategori</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val || 'consumable' })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumable" className="font-bold">Consumable</SelectItem>
                  <SelectItem value="packaging" className="font-bold">Packaging</SelectItem>
                  <SelectItem value="other" className="font-bold">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Supplier</Label>
              <Select value={formData.supplier_id} onValueChange={(val) => setFormData({ ...formData, supplier_id: val || '' })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="font-bold">Tanpa Supplier</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Info Pembelian</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Unit Size</Label>
                <div className="flex gap-1">
                  <Input type="number" value={unitSize} onChange={(e) => setUnitSize(parseInt(e.target.value) || 0)} placeholder="250" className="rounded-xl flex-1" />
                  <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val || 'ml' })}>
                    <SelectTrigger className="w-20 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ml" className="font-bold">ml</SelectItem>
                      <SelectItem value="gram" className="font-bold">gram</SelectItem>
                      <SelectItem value="pcs" className="font-bold">pcs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-slate-400">per bungkus</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Qty Beli</Label>
                <Input type="number" value={qtyBeli} onChange={(e) => setQtyBeli(parseInt(e.target.value) || 0)} placeholder="27" className="rounded-xl" />
                <p className="text-[10px] text-slate-400">jumlah bungkus</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Harga/Unit</Label>
                <Input value={hargaPerUnitInput} onChange={handleHargaPerUnitChange} placeholder="23.000" className="rounded-xl" />
                <p className="text-[10px] text-slate-400">per bungkus</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-600 uppercase">Hasil Kalkulasi</p>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="text-center">
                <p className="text-[10px] text-emerald-500">Total Bayar</p>
                <p className="text-base font-black text-emerald-700">{formatIDR(totalBayar)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-emerald-500">Stock Total</p>
                <p className="text-base font-black text-emerald-700">{totalStock.toLocaleString()} {formData.unit}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-emerald-500">Cost/{formData.unit}</p>
                <p className="text-base font-black text-emerald-700">{formatIDR(costPerUnitSize)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">Min Stock Alert</Label>
            <Input type="number" value={formData.min_stock_level} onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })} placeholder="500" className="rounded-xl" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl font-bold uppercase text-[10px]">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-xl font-bold uppercase text-[10px] bg-emerald-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {material ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}