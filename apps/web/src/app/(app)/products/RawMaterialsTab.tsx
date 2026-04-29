'use client'

import { useState } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { formatIDR } from '@/lib/utils'
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
  setShowModal: (val: boolean) => void
}

export function RawMaterialsTab({ materials, suppliers, loading, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete material?')) return
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
              <TableHead className="text-[11-xs] uppercase font-black text-slate-400">Cost/Unit</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Stock</TableHead>
              <TableHead className="text-[11px] uppercase font-black text-slate-400">Supplier</TableHead>
              <TableHead className="text-right pr-6 text-[11px] uppercase font-black text-slate-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>< TableCell colSpan={6} className="h-40 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
            ) : materials.length === 0 ? (
              <TableRow>< TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400 font-bold">No materials found</TableCell></TableRow>
            ) : (
              materials.map((m) => (
                <TableRow key={m.id} className="hover:bg-slate-50/50">
                  <TableCell className="py-4 pl-6 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      {m.stock <= m.min_stock_level && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                      {m.name}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-500 font-black px-2 py-0.5 text-[10px]">{m.category}</Badge></TableCell>
                  <TableCell className="text-sm font-black text-slate-700">{formatIDR(m.cost_per_unit)}/{m.unit}</TableCell>
                  <TableCell><span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${m.stock <= m.min_stock_level ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{m.stock} {m.unit}</span></TableCell>
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
  const [hargaUnit, setHargaUnit] = useState(0)
  const [hargaUnitInput, setHargaUnitInput] = useState('')
  const [loading, setLoading] = useState(false)

  const totalBayar = qtyBeli * hargaUnit
  const totalStockMl = qtyBeli * unitSize
  const costPerMl = totalStockMl > 0 ? Math.round(totalBayar / totalStockMl) : 0

  const handleQtyBeliChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = parseInt(e.target.value) || 0
    setQtyBeli(qty)
    updateFormData(qty, unitSize, hargaUnit)
  }

  const handleUnitSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value) || 0
    setUnitSize(size)
    updateFormData(qtyBeli, size, hargaUnit)
  }

  const handleHargaUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    const price = parseInt(raw) || 0
    setHargaUnit(price)
    setHargaUnitInput(raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
    updateFormData(qtyBeli, unitSize, price)
  }

  const updateFormData = (qty: number, size: number, price: number) => {
    const totalStock = qty * size
    const totalCost = qty * price
    const costPerUnit = totalStock > 0 ? Math.round(totalCost / totalStock) : 0
    setFormData(prev => ({ ...prev, stock: totalStock, cost_per_unit: costPerUnit }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = material ? `/api/materials/${material.id}` : '/api/materials'
      const method = material ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...await getClientAuthHeaders() }, body: JSON.stringify(formData) })
      if (res.ok) onSuccess()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-widest text-sm">{material ? 'Edit Material' : 'Add Material'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase">Nama Material</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: Susu UHT" className="rounded-xl" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Kategori</Label>
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
              <Label className="text-xs font-black uppercase">Satuan</Label>
              <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val || 'ml' })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs" className="font-bold">Pcs</SelectItem>
                  <SelectItem value="gram" className="font-bold">Gram</SelectItem>
                  <SelectItem value="kg" className="font-bold">Kg</SelectItem>
                  <SelectItem value="ml" className="font-bold">Ml</SelectItem>
                  <SelectItem value="liter" className="font-bold">Liter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Unit Size</Label>
              <div className="flex gap-1">
                <Input type="number" value={unitSize} onChange={handleUnitSizeChange} placeholder="250" className="rounded-xl" />
                <span className="flex items-center text-xs font-bold text-slate-400">{formData.unit}</span>
              </div>
              <p className="text-[10px] text-slate-400">per bungkus</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Qty Beli</Label>
              <Input type="number" value={qtyBeli} onChange={handleQtyBeliChange} placeholder="27" className="rounded-xl" />
              <p className="text-[10px] text-slate-400">bungkus</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Harga/Unit</Label>
              <Input value={hargaUnitInput} onChange={handleHargaUnitChange} placeholder="23000" className="rounded-xl" />
              <p className="text-[10px] text-slate-400">per bungkus</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Bayar</p>
                <p className="text-lg font-black text-slate-700">{formatIDR(totalBayar)}</p>
                <p className="text-[10px] text-slate-400">({qtyBeli} × {formatIDR(hargaUnit)})</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Stock</p>
                <p className="text-lg font-black text-emerald-600">{totalStockMl.toLocaleString('id-ID')} {formData.unit}</p>
                <p className="text-[10px] text-slate-400">({qtyBeli} × {unitSize})</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Cost/{formData.unit}</p>
                <p className="text-xl font-black text-emerald-600">{formatIDR(costPerMl)}/{formData.unit}</p>
              </div>
              <p className="text-[10px] text-slate-400 text-right">({formatIDR(totalBayar)} ÷ {totalStockMl.toLocaleString('id-ID')})</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase">Min Stock Alert</Label>
            <div className="flex gap-1">
              <Input type="number" value={formData.min_stock_level} onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })} placeholder="0" className="rounded-xl" />
              <span className="flex items-center text-xs font-bold text-slate-400">{formData.unit}</span>
            </div>
            <p className="text-[10px] text-slate-400">Alert jika stock di bawah ini</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase">Supplier</Label>
            <Select value={formData.supplier_id} onValueChange={(val) => setFormData({ ...formData, supplier_id: val || '' })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="font-bold">Tanpa Supplier</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl font-black uppercase text-[10px]">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-xl font-black uppercase text-[10px] bg-emerald-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {material ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}