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
import { ShoppingCart, Plus, Minus, X, Search, User, CreditCard, Package, Loader2, Camera, Trash2 } from 'lucide-react'
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
  const maxRedeemable = redeemable ? points : 0
  const normalizedRedeem = Math.min(Math.max(redeemPoints, 0), maxRedeemable)
  const pointsUsed = redeemable ? normalizedRedeem : 0
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
        <DialogContent className="sm:max-w-[500px] max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Checkout Payment</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <Label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Customer Member</Label>
              <MemberCombobox businessId={businessId} selectedMember={member} onSelect={(m) => onAddMember(m)} onCreateNew={() => setShowAddMember(true)} />
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 shadow-xl shadow-slate-200">
              <div className="flex justify-between text-xs font-bold text-slate-400"><span>Subtotal</span><span>{formatIDR(total)}</span></div>
              {pointsUsed > 0 && <div className="flex justify-between text-xs font-bold text-emerald-400"><span>Points Discount</span><span>-{formatIDR(pointsDiscount)}</span></div>}
              <div className="border-t border-slate-800 pt-3 flex justify-between text-xl font-black"><span>TOTAL</span><span>{formatIDR(finalTotal)}</span></div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <Button key={method.value} variant={paymentMethod === method.value ? "default" : "outline"} onClick={() => handleMethodSelect(method.value)} className={`h-11 text-xs font-bold ${paymentMethod === method.value ? 'bg-slate-900' : ''}`}>
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === 'qris' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">QRIS Provider</Label>
                <div className="grid grid-cols-2 gap-2">
                  {QRIS_PROVIDER_OPTIONS.map((provider) => (
                    <Button key={provider.value} variant={paymentProvider === provider.value ? "default" : "outline"} onClick={() => setPaymentProvider(provider.value)} className={`h-9 text-xs font-bold ${paymentProvider === provider.value ? 'bg-slate-900' : ''}`}>{provider.label}</Button>
                  ))}
                </div>
              </div>
            )}

            {requiresProof && (
              <div className="space-y-4 rounded-xl border border-dashed border-slate-200 p-4 bg-slate-50/50 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Payment Proof (Screenshot/Photo)</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="cursor-pointer file:bg-slate-900 file:text-white file:border-none file:text-[10px] file:font-black file:uppercase file:px-3 file:mr-3 h-10 text-xs"
                      />
                      <Camera className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    </div>
                    {proofFile && (
                      <Button variant="ghost" size="icon" onClick={() => setProofFile(null)} className="h-10 w-10 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Payment Notes</Label>
                  <Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="e.g., Transfer via BCA" className="h-9 text-xs" />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 h-12 text-xs font-black uppercase" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 h-12 text-xs font-black uppercase bg-slate-900" onClick={handleSubmit} disabled={processing}>
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
      <DialogContent className="sm:max-w-[400px] z-[70]">
        <DialogHeader><DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Member Add</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Input placeholder="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="h-10 text-xs" />
          <Input placeholder="Phone *" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="h-10 text-xs" />
          <Button type="submit" className="w-full h-10 text-xs font-black uppercase bg-slate-900" disabled={loading}>{loading ? 'Saving...' : 'Add Member'}</Button>
        </form>
      </DialogContent>
    </Dialog>
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
  const [productsLoading, setProductsLoading] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [renderMobileCheckout, setRenderMobileCheckout] = useState(false)
  const [animateMobileCheckout, setAnimateMobileCheckout] = useState(false)
  const previousCartCountRef = useRef(0)
  const [charges, setCharges] = useState({ tax_enabled: false, tax_rate: 0, service_enabled: false, service_rate: 0 })

  useEffect(() => { if (!loading && business) { fetchProducts(); fetchCharges(); } }, [loading, business])
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
    try {
      setProductsLoading(true)
      const res = await fetch(`/api/products?business_id=${business.id}&limit=1000`, { headers: await getClientAuthHeaders() })
      if (res.ok) { const data = await res.json(); setProducts(data.data || []); }
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
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Point of Sale</h1><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ready to Sell</p></div>
          <div className="relative w-full md:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input placeholder="Search product..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 text-xs bg-slate-50 border-none rounded-xl" /></div>
        </div>

        <div className="px-6 md:px-8 pb-4 overflow-x-auto flex gap-2">
          {categories.map(cat => (
            <Button key={cat} variant={selectedCategory === cat ? "default" : "secondary"} onClick={() => setSelectedCategory(cat)} className={`h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedCategory === cat ? 'bg-slate-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{cat === 'all' ? 'All Items' : cat}</Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 pt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {productsLoading && filteredProducts.length === 0 ? (
            <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-300">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Fetching Products...</p>
            </div>
          ) : (
            filteredProducts.map(p => (
              <div key={p.id} onClick={() => p.stock > 0 && addToCart(p)} className={`group relative bg-white border border-slate-100 p-3 rounded-2xl transition-all hover:shadow-xl hover:border-slate-300 cursor-pointer active:scale-95 ${p.stock <= 0 ? 'opacity-40 grayscale' : ''}`}>
                <div className="aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center"><Package className="text-slate-200" size={32} /></div>
                <h3 className="font-bold text-slate-800 text-xs truncate mb-1">{p.name}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">{p.category}</p>
                <div className="flex items-center justify-between"><span className="font-black text-slate-900 text-xs">{formatIDR(p.price)}</span><span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${p.stock <= 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.stock}</span></div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-col bg-slate-50 border-l w-[380px]">
        <div className="p-6 border-b flex justify-between items-center"><div className="flex items-center gap-2"><ShoppingCart size={16} className="text-slate-900" /><span className="font-black text-sm uppercase tracking-widest">Cart</span></div>{cart.length > 0 && <Button variant="ghost" onClick={clearCart} className="text-[10px] font-black uppercase text-rose-500 p-0 h-auto">Clear</Button>}</div>
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.product.id} className="flex gap-3">
                <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-xs truncate">{item.product.name}</p><p className="text-[10px] font-black text-slate-400">{formatIDR(item.product.price)}</p></div>
                <div className="flex items-center bg-white rounded-lg border h-8 px-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, item.qty - 1)}><Minus size={10} /></Button><span className="w-6 text-center text-[10px] font-black">{item.qty}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, item.qty + 1)}><Plus size={10} /></Button></div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-6 bg-white border-t space-y-4">
          <Button variant="outline" className="w-full h-12 justify-start bg-slate-50 border-none rounded-xl" onClick={() => setShowPaymentModal(true)}>
            <User size={14} className="mr-2 text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{selectedMember?.name || 'Customer Member'}</span>
          </Button>
          <div className="space-y-1.5"><div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter"><span>Subtotal</span><span>{formatIDR(cartTotal)}</span></div><div className="flex justify-between text-lg font-black"><span>TOTAL</span><span>{formatIDR(estimatedTotal)}</span></div></div>
          <Button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0} className="w-full h-14 bg-slate-900 rounded-xl font-black uppercase tracking-widest shadow-lg">Checkout</Button>
        </div>
      </div>

      {showPaymentModal && <PaymentModal total={cartTotal} points={memberPoints} member={selectedMember} taxEnabled={charges.tax_enabled} taxRate={charges.tax_rate} serviceEnabled={charges.service_enabled} serviceRate={charges.service_rate} onClose={() => setShowPaymentModal(false)} onConfirm={handleCheckout} onAddMember={setSelectedMember} businessId={business?.id || ''} />}
    </div>
  )
}
