'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'
import { formatIDR } from '@/lib/utils'
import { Product } from '@/lib/types'

interface ProductMaterial {
  id: string
  material_id: string
  qty_needed: number
}

interface RawMaterial {
  id: string
  name: string
  unit: string
  cost_per_unit: number
}

interface Props {
  product: Product
  materials: RawMaterial[]
  productMaterials: ProductMaterial[]
  open: boolean
  onClose: () => void
  onSave: () => void
  saving: boolean
  setProductMaterials: React.Dispatch<React.SetStateAction<ProductMaterial[]>>
}

export function MaterialSelectionDialog({ product, materials, productMaterials, open, onClose, onSave, saving, setProductMaterials }: Props) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-widest text-sm">
            Atur Bahan Baku - {product.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {materials.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">No materials. Add in "Bahan Baku" tab first.</p>
          ) : (
            materials.map(material => {
              const existing = productMaterials.find(pm => pm.material_id === material.id)
              return (
                <div key={material.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{material.name}</p>
                    <p className="text-[10px] text-slate-500">{formatIDR(material.cost_per_unit)} / {material.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Qty"
                      value={existing?.qty_needed || ''}
                      onChange={(e) => {
                        const qty = parseFloat(e.target.value) || 0
                        setProductMaterials(prev => {
                          const filtered = prev.filter(pm => pm.material_id !== material.id)
                          if (qty > 0) {
                            return [...filtered, { id: existing?.id || '', material_id: material.id, qty_needed: qty }]
                          }
                          return filtered
                        })
                      }}
                      className="w-20 h-8 text-xs rounded-lg"
                    />
                    <span className="text-[10px] text-slate-400">{material.unit}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl font-black uppercase text-[10px]" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 rounded-xl font-black uppercase text-[10px] bg-emerald-600" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Materials
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}