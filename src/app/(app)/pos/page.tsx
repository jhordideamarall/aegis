'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'
import {
  PAYMENT_METHOD_OPTIONS,
  QRIS_PROVIDER_OPTIONS,
  formatPaymentDisplay,
  getPaymentMethodLabel,
  getPaymentProviderLabel,
  paymentMethodRequiresProof,
  type PaymentMethod,
  type PaymentProvider
} from '@/lib/payments'
import { formatIDR } from '@/lib/utils'
import { Product, CartItem, Member } from '@/lib/types'
import MemberSearch from '@/components/MemberSearch'
import { MemberCombobox } from '@/components/MemberCombobox'
import { ShoppingCart, Plus, Minus, X, Search, User, CreditCard, Package, Loader2, Camera, Trash2, Layers, Gift } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const POS_PRODUCTS_CACHE_TTL_MS = 30 * 1000

interface PaymentSubmission {
  method: PaymentMethod
  provider: PaymentProvider | null
  notes: string
  proofFile: File | null
}

interface PaymentModalProps {
  total: number
  points: number
  member: Member | null
  taxEnabled: boolean
  taxRate: number
  serviceEnabled: boolean
  serviceRate: number
  onClose: () => void
  onConfirm: (payment: PaymentSubmission, redeemPoints: number) => void
  onAddMember: (member: Member | null) => void
  businessId: string
}

function PaymentModal({
  total,
  points,
  member,
  taxEnabled,
  taxRate,
  serviceEnabled,
  serviceRate,
  onClose,
  onConfirm,
  onAddMember,
  businessId
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider | null>(null)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [redeemPoints, setRedeemPoints] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  const redemptionPoints = 20
  const redeemable = points >= redemptionPoints
  const maxRedeemable = redeemable ? Math.floor(points / redemptionPoints) * redemptionPoints : 0
  
  const pointsUsed = Math.min(Math.max(redeemPoints, 0), maxRedeemable)
  const pointsDiscount = pointsUsed > 0 ? Math.min(pointsUsed * 100, total) : 0
  const taxableBase = Math.max(total - pointsDiscount, 0)
  const taxAmount = taxEnabled ? Math.round((taxableBase * taxRate) / 100) : 0
  const serviceAmount = serviceEnabled ? Math.round((taxableBase * serviceRate) / 100) : 0
  const finalTotal = taxableBase + taxAmount + serviceAmount
  const requiresProof = paymentMethodRequiresProof(paymentMethod)

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method)
    if (method === 'qris') { setPaymentProvider((current) => current || 'general'); return; }
    setPaymentProvider(null)
  }

  const handleSubmit = async () => {
    setProcessing(true)
    try { await onConfirm({ method: paymentMethod, provider: paymentMethod === 'qris' ? (paymentProvider || 'general') : null, notes: paymentNotes.trim(), proofFile }, pointsUsed) } finally { setProcessing(false) }
  }

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px] max-h-[95vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Checkout Payment</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Customer Member</Label>
              <MemberCombobox businessId={businessId} selectedMember={member} onSelect={(m) => onAddMember(m)} onCreateNew={() => setShowAddMember(true)} />
              
              {member && (
                <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Gift size={16} className="text-blue-500" />
                      <span className="text-[11px] font-black uppercase text-slate-600">Points Available</span>
                    </div>
                    <span className="text-sm font-black text-blue-600">{points.toLocaleString()} PTS</span>
                  </div>
                  
                  {redeemable ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <span>Use Points</span>
                        <span>Max {maxRedeemable.toLocaleString()}</span>
                      </div>
                      <Input 
                        type="number" 
                        value={redeemPoints || ''} 
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                          setRedeemPoints(Math.min(val, maxRedeemable))
                        }}
                        placeholder="Points to use..."
                        className="h-10 text-sm font-black rounded-xl border-slate-200"
                      />
                      <div className="p-2 bg-emerald-50 rounded-lg text-center">
                        <p className="text-[10px] font-black text-emerald-600 uppercase">Discount: -{formatIDR(pointsUsed * 100)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium text-center">Min. {redemptionPoints} pts required to redeem</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3 shadow-xl">
              <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-widest"><span>Subtotal</span><span>{formatIDR(total)}</span></div>
              {pointsUsed > 0 && <div className="flex justify-between text-[11px] font-black uppercase text-emerald-400 tracking-widest"><span>Points Discount</span><span>-{formatIDR(pointsUsed * 100)}</span></div>}
              {taxEnabled && <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-widest"><span>Tax ({taxRate}%)</span><span>{formatIDR(taxAmount)}</span></div>}
              {serviceEnabled && <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-widest"><span>Service ({serviceRate}%)</span><span>{formatIDR(serviceAmount)}</span></div>}
              <div className="border-t border-slate-800 pt-4 flex justify-between text-2xl font-black tracking-tighter"><span>TOTAL</span><span>{formatIDR(finalTotal)}</span></div>
            </div>

            <div className="space-y-4">
              <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <Button key={method.value} variant={paymentMethod === method.value ? "default" : "outline"} onClick={() => handleMethodSelect(method.value)} className={`h-12 text-xs font-black uppercase tracking-widest rounded-xl ${paymentMethod === method.value ? 'bg-slate-900 shadow-xl' : 'border-slate-100 text-slate-400'}`}>
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === 'qris' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-3">
                <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">QRIS Provider</Label>
                <div className="grid grid-cols-2 gap-3">
                  {QRIS_PROVIDER_OPTIONS.map((provider) => (
                    <Button key={provider.value} variant={paymentProvider === provider.value ? "default" : "outline"} onClick={() => setPaymentProvider(provider.value)} className={`h-11 text-xs font-black uppercase tracking-widest rounded-xl ${paymentProvider === provider.value ? 'bg-slate-900 shadow-lg' : 'border-slate-100 text-slate-400'}`}>{provider.label}</Button>
                  ))}
                </div>
              </div>
            )}

            {requiresProof && (
              <div className="space-y-5 rounded-2xl border-2 border-dashed border-slate-100 p-6 bg-slate-50/30 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Payment Proof (Screenshot/Photo)</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="cursor-pointer file:bg-slate-900 file:text-white file:border-none file:text-[10px] file:font-black file:uppercase file:px-4 file:mr-4 h-12 text-xs rounded-xl bg-white shadow-sm"
                      />
                      <Camera className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-200 pointer-events-none" />
                    </div>
                    {proofFile && (
                      <Button variant="ghost" size="icon" onClick={() => setProofFile(null)} className="h-12 w-12 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={18} /></Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Payment Notes</Label>
                  <Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="e.g., Transfer via BCA" className="h-11 text-xs font-bold rounded-xl border-slate-100 bg-white" />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1 h-14 text-[11px] font-black uppercase tracking-widest rounded-xl border-slate-200" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 h-14 text-[11px] font-black uppercase tracking-widest bg-slate-900 rounded-xl shadow-2xl shadow-slate-200" onClick={handleSubmit} disabled={processing}>
                {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Confirm Pay
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showAddMember && <AddMemberQuickForm onClose={() => setShowAddMember(false)} onSuccess={(newMember: Member) => { onAddMember(newMember); setShowAddMember(false); }} />}
    </>
  )
}

function AddMemberQuickForm({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', points: 0 })
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/members', { method: 'POST', headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ ...formData }) })
      if (res.ok) onSuccess(await res.json())
    } catch (err) {} finally { setLoading(false) }
  }
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] z-[70] rounded-2xl border-none shadow-2xl">
        <DialogHeader><DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Add Member</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <Input placeholder="Member Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="h-12 text-sm font-bold rounded-xl border-slate-100 bg-slate-50 focus:bg-white transition-colors" />
          <Input placeholder="Phone Number *" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="h-12 text-sm font-bold rounded-xl border-slate-100 bg-slate-50 focus:bg-white transition-colors" />
          <Button type="submit" className="w-full h-14 text-xs font-black uppercase tracking-widest bg-slate-900 rounded-xl shadow-xl shadow-slate-200" disabled={loading}>{loading ? 'Saving...' : 'Add Member'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProductGridSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[220px] overflow-hidden rounded-2xl border border-slate-100 bg-white"
        >
          <div className="aspect-[4/3] animate-pulse border-b border-slate-100 bg-slate-100" />
          <div className="space-y-4 p-3.5 md:p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
              <div className="h-5 w-10 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export default function POSPage() {
  const router = useRouter()
  const { business, loading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showCartSheet, setShowCartSheet] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [portalReady, setPortalReady] = useState(false)
  const [renderMobileCheckout, setRenderMobileCheckout] = useState(false)
  const [animateMobileCheckout, setAnimateMobileCheckout] = useState(false)
  const previousCartCountRef = useRef(0)
  const [charges, setCharges] = useState({ tax_enabled: false, tax_rate: 0, service_enabled: false, service_rate: 0 })

  useEffect(() => {
    if (loading) {
      setProductsLoading(true)
      return
    }

    if (!business) {
      setProductsLoading(false)
      return
    }

    fetchProducts()
    fetchCharges()
  }, [loading, business])
  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    const previousCartCount = previousCartCountRef.current
    if (cart.length > 0) {
      setRenderMobileCheckout(true)
      if (previousCartCount === 0) { setAnimateMobileCheckout(false); window.requestAnimationFrame(() => setAnimateMobileCheckout(true)); }
    } else { setAnimateMobileCheckout(false); setRenderMobileCheckout(false); }
    previousCartCountRef.current = cart.length
  }, [cart.length])

  const fetchCharges = async () => {
    if (!business) return
    try {
      const res = await fetch(`/api/settings?business_id=${business.id}`, { headers: await getClientAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setCharges({ tax_enabled: data.tax_enabled === true, tax_rate: Number(data.tax_rate) || 0, service_enabled: data.service_enabled === true, service_rate: Number(data.service_rate) || 0 })
      }
    } catch (error) {}
  }

  const fetchProducts = async () => {
    if (!business) return
    const cacheKey = `pos-products:${business.id}`
    const cached = getClientCache<Product[]>(cacheKey)

    if (cached) {
      setProducts(cached)
      setProductsLoading(false)
    } else {
      setProducts([])
      setProductsLoading(true)
    }

    try {
      const res = await fetch(`/api/products?business_id=${business.id}&limit=1000`, { headers: await getClientAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        const nextProducts = data.data || []
        setProducts(nextProducts)
        setClientCache(cacheKey, nextProducts, POS_PRODUCTS_CACHE_TTL_MS)
      }
    } catch (error) {} finally { setProductsLoading(false) }
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]
  const filteredProducts = products.filter(p => (selectedCategory === 'all' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      return [...prev, { product, qty: 1 }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== productId)); return; }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, qty } : i))
  }

  const clearCart = () => { setCart([]); setSelectedMember(null); }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0)
  const memberPoints = selectedMember?.points || 0
  const estimatedTotal = cartTotal + (charges.tax_enabled ? Math.round((cartTotal * charges.tax_rate) / 100) : 0) + (charges.service_enabled ? Math.round((cartTotal * charges.service_rate) / 100) : 0)

  const handleCheckout = async (payment: PaymentSubmission, redeemPoints: number) => {
    if (!business || cart.length === 0) return
    setProcessing(true)
    try {
      const discount = redeemPoints * 100
      const taxableBase = Math.max(cartTotal - discount, 0)
      const finalTotal = taxableBase + (charges.tax_enabled ? Math.round((taxableBase * charges.tax_rate) / 100) : 0) + (charges.service_enabled ? Math.round((taxableBase * charges.service_rate) / 100) : 0)
      const { data: { session } } = await supabase.auth.getSession()
      
      const orderRes = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ business_id: business.id, total: finalTotal, payment_method: payment.method, payment_provider: payment.provider, payment_notes: payment.notes, member_id: selectedMember?.id || null, points_earned: Math.floor(cartTotal/10000), points_used: redeemPoints, discount, items: cart.map(i => ({ product_id: i.product.id, qty: i.qty, price: i.product.price })) }) })
      
      if (orderRes.ok) { 
        const order = await orderRes.json()
        
        if (payment.proofFile) {
          const proofFormData = new FormData()
          proofFormData.append('business_id', business.id)
          proofFormData.append('file', payment.proofFile)
          await fetch(`/api/orders/${order.id}/proof`, {
            method: 'POST',
            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
            body: proofFormData
          })
        }
        
        router.push(`/orders?id=${order.id}&print=true`)
      }
    } catch (error) {} finally { setProcessing(false); setShowPaymentModal(false); }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Point of Sale</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Ready to Sell</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input 
              placeholder="Quick search products..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-11 h-12 text-sm bg-slate-50 border-none rounded-xl focus:ring-slate-900 shadow-inner font-bold" 
            />
          </div>
        </div>

        <div className="px-6 md:px-8 pb-6 overflow-x-auto flex items-center gap-2 no-scrollbar">
           <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200 shadow-inner">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)} 
                className={`h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${
                  selectedCategory === cat 
                    ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {cat === 'all' ? 'All Items' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5 no-scrollbar">
          {productsLoading && filteredProducts.length === 0 ? (
            <ProductGridSkeleton />
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full h-96 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center">
              <Package className="mb-4 h-10 w-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Produk tidak ditemukan</p>
              <p className="mt-1 text-xs text-slate-400">Coba ubah kata kunci atau kategori produk.</p>
            </div>
          ) : (
            filteredProducts.map(p => (
              <button
                type="button"
                key={p.id} 
                onClick={() => p.stock > 0 && addToCart(p)} 
                disabled={p.stock <= 0}
                aria-label={`${p.name}, harga ${formatIDR(p.price)}, stok ${p.stock}`}
                className={`group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border bg-white text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                  p.stock <= 0
                    ? 'cursor-not-allowed border-slate-100 opacity-60 grayscale'
                    : 'cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg active:scale-[0.98]'
                }`}
              >
                <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100 shrink-0">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <Package className="w-10 h-10 text-slate-200" />
                  )}
                </div>
                <div className="p-3.5 md:p-4 bg-white flex flex-col flex-1">
                  <h3 className="min-h-10 font-black text-slate-900 text-sm leading-5 break-words" title={p.name}>
                    {p.name}
                  </h3>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="min-w-0 text-sm font-black text-slate-900 tabular-nums">
                      {formatIDR(p.price)}
                    </span>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums ${
                      p.stock <= 0
                        ? 'bg-slate-100 text-slate-500'
                        : p.stock <= 5
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {p.stock <= 0 ? 'Habis' : p.stock.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Cart Sidebar - Refined Sidebar */}
      <div className="hidden lg:flex flex-col bg-slate-50 border-l w-[380px]">
        <div className="p-6 border-b flex justify-between items-center bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-slate-900" />
            <span className="font-black text-sm uppercase tracking-widest">Cart</span>
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" onClick={clearCart} className="text-[10px] font-black uppercase text-rose-500 p-0 h-auto hover:bg-transparent">
              Clear
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 opacity-50">
                <Package size={48} className="mb-4 stroke-[1px]" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Empty Selection</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="w-12 h-12 rounded-lg bg-white border border-slate-100 flex-shrink-0 overflow-hidden shadow-sm">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-slate-50" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p className="font-bold text-slate-800 text-xs truncate uppercase tracking-tight leading-none mb-1">{item.product.name}</p>
                    <p className="text-[11px] font-black text-slate-400 tracking-tighter">{formatIDR(item.product.price)}</p>
                  </div>
                  <div className="flex items-center bg-white rounded-xl border border-slate-100 p-1 shadow-sm h-10">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg text-slate-300 hover:text-slate-900" onClick={() => updateQty(item.product.id, item.qty - 1)}><Minus size={12} /></Button>
                    <span className="w-6 text-center text-xs font-black text-slate-900">{item.qty}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg text-slate-300 hover:text-slate-900" onClick={() => updateQty(item.product.id, item.qty + 1)}><Plus size={12} /></Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-6 bg-white border-t space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          <Button variant="outline" className="w-full h-12 justify-start bg-slate-50 border-none rounded-xl hover:bg-slate-100 transition-all group px-4" onClick={() => setShowMemberModal(true)}>
            <User size={14} className="mr-3 text-slate-400 group-hover:text-slate-900" />
            <div className="text-left">
              <span className="text-[10px] font-black uppercase text-slate-600">{selectedMember?.name || 'Customer Member'}</span>
            </div>
          </Button>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Subtotal</span>
              <span className="text-xs font-black text-slate-500">{formatIDR(cartTotal)}</span>
            </div>
            <div className="flex justify-between items-end px-1 border-t border-slate-50 pt-2">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">TOTAL</span>
              <span className="text-3xl font-black tracking-tighter text-slate-900">{formatIDR(estimatedTotal)}</span>
            </div>
          </div>

          <Button 
            onClick={() => setShowPaymentModal(true)} 
            disabled={cart.length === 0} 
            className="w-full h-14 bg-slate-900 hover:bg-black rounded-xl font-black uppercase tracking-[0.16em] text-xs shadow-2xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-95"
          >
            Create Order
          </Button>
        </div>
      </div>

      {showPaymentModal && <PaymentModal total={cartTotal} points={memberPoints} member={selectedMember} taxEnabled={charges.tax_enabled} taxRate={charges.tax_rate} serviceEnabled={charges.service_enabled} serviceRate={charges.service_rate} onClose={() => setShowPaymentModal(false)} onConfirm={handleCheckout} onAddMember={setSelectedMember} businessId={business?.id || ''} />}
      
      {showMemberModal && (
        <MemberSearch
          onSelect={(member) => {
            setSelectedMember(member)
            setShowMemberModal(false)
          }}
          onClose={() => setShowMemberModal(false)}
          businessId={business?.id || ''}
        />
      )}
    </div>
  )
}
