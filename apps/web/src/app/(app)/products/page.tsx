'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { formatIDR } from '@/lib/utils'
import { Product } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RawMaterialsTab } from './RawMaterialsTab'
import { SuppliersTab } from './SuppliersTab'
import { MaterialSelectionDialog } from './MaterialSelectionDialog'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  Layers, 
  Loader2,
  Box,
  Truck
} from 'lucide-react'

function formatPriceInput(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function ProductsPage() {
  const { business, loading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [fetchingMaterials, setFetchingMaterials] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [productMaterials, setProductMaterials] = useState<any[]>([])
  const [showMaterialsDialog, setShowMaterialsDialog] = useState(false)
  const [savingMaterials, setSavingMaterials] = useState(false)

  const limit = 20
  const isLoading = loading || fetching

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  useEffect(() => {
    if (business) {
      fetchProducts()
      fetchMaterials()
      fetchSuppliers()
      fetchAllProductMaterials()
    }
  }, [business, debouncedSearch, selectedCategory, page])

  const fetchAllProductMaterials = async () => {
    const res = await fetch('/api/product-materials', { headers: await getClientAuthHeaders() })
    if (res.ok) {
      const data = await res.json()
      setProductMaterials(data.data || [])
    }
  }

  const calculateProductHpp = (productId: string) => {
    const pms = productMaterials.filter(pm => pm.product_id === productId)
    return pms.reduce((total, pm) => {
      const material = pm.raw_materials
      return total + (material?.cost_per_unit || 0) * pm.qty_needed
    }, 0)
  }

  const fetchMaterials = useCallback(async () => {
    if (!business) return
    try {
      const res = await fetch(`/api/materials?business_id=${business.id}`, {
        headers: await getClientAuthHeaders()
      })
      if (res.ok) {
        const result = await res.json()
        setMaterials(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    } finally {
      setFetchingMaterials(false)
    }
  }, [business])

  const fetchSuppliers = useCallback(async () => {
    if (!business) return
    try {
      const res = await fetch(`/api/suppliers?business_id=${business.id}`, {
        headers: await getClientAuthHeaders()
      })
      if (res.ok) {
        const result = await res.json()
        setSuppliers(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }, [business])

  const fetchProducts = useCallback(async () => {
    if (!business) return
    try {
      const cacheKey = `products:${business.id}:${debouncedSearch}:${selectedCategory}:${page}`
      const cached = getClientCache<{ data: Product[]; total: number }>(cacheKey)
      if (cached) {
        setProducts(cached.data)
        setTotal(cached.total)
        setFetching(false)
      } else {
        setFetching(true)
      }

      const params = new URLSearchParams({
        business_id: business.id,
        page: String(page),
        limit: String(limit)
      })
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory)

      const res = await fetch(`/api/products?${params.toString()}`, {
        headers: await getClientAuthHeaders()
      })
      if (res.ok) {
        const result = await res.json()
        setProducts(result.data || [])
        setTotal(result.total || 0)
        setClientCache(cacheKey, { data: result.data || [], total: result.total || 0 })
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setFetching(false)
    }
  }, [business, debouncedSearch, selectedCategory, page])

  const fetchProductMaterials = async (productId: string) => {
    const res = await fetch(`/api/product-materials?product_id=${productId}`, {
      headers: await getClientAuthHeaders()
    })
    if (res.ok) {
      const data = await res.json()
      setProductMaterials(data.data || [])
    }
  }

  const handleSaveMaterials = async () => {
    if (!editingProduct) return
    setSavingMaterials(true)
    try {
      await fetch(`/api/product-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getClientAuthHeaders() },
        body: JSON.stringify({
          business_id: business?.id,
          product_id: editingProduct.id,
          materials: productMaterials.map(pm => ({ material_id: pm.material_id, qty_needed: pm.qty_needed }))
        })
      })
      setShowMaterialsDialog(false)
    } catch (e) { console.error(e) }
    finally { setSavingMaterials(false) }
  }

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    fetchProductMaterials(product.id)
    setShowModal(true)
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  const handleDelete = async (id: string) => {
    if (!business) return
    if (!window.confirm('Delete this product?')) return
    setProducts(prev => prev.filter(p => p.id !== id))
    setTotal(prev => Math.max(0, prev - 1))
    try {
      const res = await fetch(`/api/products/${id}?business_id=${business.id}`, {
        method: 'DELETE',
        headers: await getClientAuthHeaders()
      })
      if (!res.ok) fetchProducts()
    } catch {
      fetchProducts()
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-black tracking-tight uppercase">Inventory</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Product Catalog</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-6 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Stock Value</p>
              <p className="text-lg font-black text-slate-900 tracking-tight">{formatIDR(products.reduce((acc, p) => acc + (p.price * p.stock), 0))}</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Stock Modal</p>
              <p className="text-lg font-black text-slate-600 tracking-tight">{formatIDR(products.reduce((acc, p) => acc + (calculateProductHpp(p.id) * p.stock), 0))}</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Low Items</p>
              <p className="text-lg font-black text-rose-600 tracking-tight">{products.filter(p => p.stock <= 5).length}</p>
            </div>
          </div>
          <Button
            onClick={() => { setEditingProduct(null); setShowModal(true); }}
            className="h-10 px-5 rounded-xl font-black uppercase bg-slate-900 hover:bg-slate-800 text-[10px] tracking-widest shadow-lg shadow-slate-200"
          >
            <Plus className="mr-2 h-4 w-4" /> New Product
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="h-12 bg-slate-100 rounded-xl p-1 gap-1">
          <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest gap-2">
            <Package className="h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="materials" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest gap-2">
            <Box className="h-4 w-4" /> Bahan Baku
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest gap-2">
            <Truck className="h-4 w-4" /> Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search product..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-9 h-10 text-xs bg-white rounded-xl border-slate-200 shadow-sm"
                />
              </div>
              <Select value={selectedCategory} onValueChange={(val) => { if (val) { setSelectedCategory(val); setPage(1); } }}>
                <SelectTrigger className="h-8 w-full sm:w-[160px] text-[10px] font-black uppercase tracking-widest bg-white rounded-lg border-slate-200 shadow-sm">
                  <Layers className="mr-2 h-3 w-3 text-slate-400" />
                  <SelectValue placeholder="Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase">
                      {cat === 'all' ? 'ALL CATEGORIES' : cat.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="border-none">
                    <TableHead className="py-4 pl-6 text-[11px] uppercase font-black text-slate-400 tracking-widest">Product</TableHead>
                    <TableHead className="text-[11px] uppercase font-black text-slate-400 tracking-widest">Category</TableHead>
                    <TableHead className="text-[11px] uppercase font-black text-slate-400 tracking-widest">HPP</TableHead>
                    <TableHead className="text-[11px] uppercase font-black text-slate-400 tracking-widest">Price</TableHead>
                    <TableHead className="text-[11px] uppercase font-black text-slate-400 tracking-widest">Stock</TableHead>
                    <TableHead className="text-right pr-6 text-[11px] uppercase font-black text-slate-400 tracking-widest">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && products.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
                  ) : products.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400 font-bold uppercase">No products found</TableCell></TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id} className="hover:bg-slate-50/50 border-slate-100">
                        <TableCell className="py-4 pl-6 font-bold text-slate-800 text-sm">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 font-black px-2 py-0.5 text-[10px] uppercase border-slate-200">
                            {product.category || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-400 font-bold">{formatIDR(calculateProductHpp(product.id))}</TableCell>
                        <TableCell className="text-sm font-black text-slate-900">{formatIDR(product.price)}</TableCell>
                        <TableCell>
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${product.stock <= 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {product.stock} pcs
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => handleEditClick(product)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600" onClick={() => handleDelete(product.id)}>
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
            
            {products.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-slate-50/30 border-t">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Showing {startItem}-{endItem} / {total}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase rounded-xl border-slate-200 bg-white" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                  <div className="h-9 px-4 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-[10px] font-black shadow-sm">{page} / {totalPages}</div>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase rounded-xl border-slate-200 bg-white" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="mt-6">
          <RawMaterialsTab materials={materials} suppliers={suppliers} loading={fetchingMaterials} onRefresh={fetchMaterials} setShowModal={setShowMaterialModal} />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <SuppliersTab suppliers={suppliers} onRefresh={fetchSuppliers} setShowModal={setShowSupplierModal} />
        </TabsContent>
      </Tabs>

      {showModal && (
        <ProductFormModal
          product={editingProduct}
          materials={materials}
          productMaterials={productMaterials}
          setProductMaterials={setProductMaterials}
          businessId={business?.id || ''}
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
          onSuccess={() => { fetchProducts(); setShowModal(false); setEditingProduct(null); }}
          onOpenMaterials={() => setShowMaterialsDialog(true)}
        />
      )}

      {showMaterialsDialog && editingProduct && (
        <MaterialSelectionDialog
          product={editingProduct}
          materials={materials}
          productMaterials={productMaterials}
          open={showMaterialsDialog}
          onClose={() => setShowMaterialsDialog(false)}
          onSave={handleSaveMaterials}
          saving={savingMaterials}
          setProductMaterials={setProductMaterials}
        />
      )}
    </div>
  )
}

interface ProductFormModalProps {
  product: Product | null
  materials: any[]
  productMaterials: any[]
  setProductMaterials: React.Dispatch<React.SetStateAction<any[]>>
  businessId: string
  onClose: () => void
  onSuccess: () => void
  onOpenMaterials: () => void
}

function ProductFormModal({ product, materials, productMaterials, setProductMaterials, businessId, onClose, onSuccess, onOpenMaterials }: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price || 0,
    hpp: product?.hpp || 0,
    stock: product?.stock || 0,
    category: product?.category || '',
    image_url: product?.image_url || null
  })
  const [priceInput, setPriceInput] = useState(product?.price ? formatPriceInput(product.price) : '')
  const [stockInput, setStockInput] = useState(product?.stock !== undefined ? product.stock.toString() : '0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    setPriceInput(rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
    setFormData({ ...formData, price: parseInt(rawValue) || 0 })
  }

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    setStockInput(rawValue)
    setFormData({ ...formData, stock: parseInt(rawValue) || 0 })
  }

  const calculatedHpp = productMaterials.reduce((total, pm) => {
    const material = materials.find(m => m.id === pm.material_id)
    return total + (material?.cost_per_unit || 0) * pm.qty_needed
  }, 0)

  const displayHpp = calculatedHpp > 0 ? calculatedHpp : (product?.hpp || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...formData, hpp: calculatedHpp > 0 ? calculatedHpp : formData.hpp, business_id: businessId })
      })
      if (res.ok) onSuccess()
      else {
        const data = await res.json()
        setError(data.error || 'Failed to save product')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] rounded-2xl border-none shadow-2xl">
        <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-400">{product ? 'Edit Product' : 'Add New Product'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100">{error}</div>}
          
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Product Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="h-11 text-xs font-bold rounded-xl border-slate-200" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Category</Label>
              <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required className="h-11 text-xs font-bold rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Stock</Label>
              <Input id="stock" type="text" inputMode="numeric" value={stockInput} onChange={handleStockChange} required className="h-11 text-xs font-bold rounded-xl border-slate-200" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">HPP (Cost)</Label>
              <div className="h-11 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-600">{formatIDR(displayHpp)}</span>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold">Auto-calculated from materials</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Price (Sell)</Label>
              <Input id="price" value={priceInput} onChange={handlePriceChange} required className="h-11 text-xs font-bold rounded-xl border-slate-200" />
            </div>
          </div>
          
          {product && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Bahan Baku</Label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-600">{productMaterials.length} material(s)</p>
                    {calculatedHpp > 0 && <p className="text-[10px] text-emerald-600 font-bold">Auto-HPP: {formatIDR(calculatedHpp)}</p>}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase rounded-lg" onClick={onOpenMaterials}>Atur Bahan</Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1 h-12 text-xs font-black uppercase tracking-widest rounded-xl border-slate-200" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-12 text-xs font-black uppercase tracking-widest bg-slate-900 rounded-xl" disabled={loading}>{loading ? 'Saving...' : 'Confirm Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}