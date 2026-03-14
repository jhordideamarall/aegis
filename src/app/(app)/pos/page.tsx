'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { formatIDR } from '@/lib/utils'
import { Product, CartItem, Member } from '@/lib/types'
import Modal from '@/components/Modal'
import MemberSearch from '@/components/MemberSearch'
import { ShoppingCart, Plus, Minus, X, Search, User, CreditCard, Package } from 'react-feather'

interface PaymentModalProps {
  total: number
  points: number
  member: Member | null
  taxEnabled: boolean
  taxRate: number
  serviceEnabled: boolean
  serviceRate: number
  onClose: () => void
  onConfirm: (paymentMethod: string, redeemPoints: number) => void
  onAddMember: (member: Member) => void
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
  onAddMember
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
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

  const handleSubmit = async () => {
    setProcessing(true)
    await onConfirm(paymentMethod, pointsUsed)
    setProcessing(false)
  }

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Payment" size="lg">
        <div className="space-y-6">
          {/* Member Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Member</span>
              {member ? (
                <span className="text-sm text-blue-600">{member.name}</span>
              ) : (
                <span className="text-sm text-blue-400">No member selected</span>
              )}
            </div>
            {member ? (
              <div className="text-sm text-blue-600">
                <p>{member.phone} • {member.points} points available</p>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMember(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add new member
              </button>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatIDR(total)}</span>
            </div>
            {pointsUsed > 0 && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Points Discount ({pointsUsed} pts)</span>
                <span>-{formatIDR(pointsDiscount)}</span>
              </div>
            )}
            {taxEnabled && (
              <div className="flex justify-between mb-2 text-gray-600">
                <span>Tax ({taxRate}%)</span>
                <span>{formatIDR(taxAmount)}</span>
              </div>
            )}
            {serviceEnabled && (
              <div className="flex justify-between mb-2 text-gray-600">
                <span>Service ({serviceRate}%)</span>
                <span>{formatIDR(serviceAmount)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">{formatIDR(finalTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-3 gap-3">
              {['cash', 'debit', 'credit', 'gopay', 'ovo', 'dana'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 px-4 rounded-lg border-2 font-medium capitalize transition-all ${
                    paymentMethod === method
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {points > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800">Redeem points</p>
                  <p className="text-sm text-gray-600">
                    {redeemable ? `Min ${redemptionPoints} pts` : `Need ${redemptionPoints - points} more points`}
                  </p>
                </div>
                <select
                  value={pointsUsed}
                  onChange={(e) => setRedeemPoints(parseInt(e.target.value, 10) || 0)}
                  disabled={!redeemable}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm disabled:opacity-50"
                >
                  <option value={0}>No redemption</option>
                  {redeemable &&
                    Array.from({ length: Math.floor((maxRedeemable - redemptionPoints) / 10) + 1 }, (_, i) => {
                      const value = redemptionPoints + i * 10
                      return (
                        <option key={value} value={value}>
                          {value} pts
                        </option>
                      )
                    })}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={processing}
              className="flex-1 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
            >
              {processing ? 'Processing...' : `Pay ${formatIDR(finalTotal)}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberQuickForm
          onClose={() => setShowAddMember(false)}
          onSuccess={(newMember) => {
            onAddMember(newMember)
            setShowAddMember(false)
          }}
        />
      )}
    </>
  )
}

interface AddMemberQuickFormProps {
  onClose: () => void
  onSuccess: (member: Member) => void
}

function AddMemberQuickForm({ onClose, onSuccess }: AddMemberQuickFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    points: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get business_id from localStorage or context
      const res = await fetch('/api/businesses/my')
      const bizData = await res.json()
      
      if (!bizData.business?.id) {
        throw new Error('Business not found')
      }

      const memberRes = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          business_id: bizData.business.id
        })
      })

      if (!memberRes.ok) {
        const data = await memberRes.json()
        throw new Error(data.error || 'Failed to add member')
      }

      const member = await memberRes.json()
      onSuccess(member)
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">Add New Member</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Ahmad Rizki"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="08[0-9]{8,11}"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ahmad@email.com"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  const [renderCartSheet, setRenderCartSheet] = useState(false)
  const [showCartSheetContent, setShowCartSheetContent] = useState(false)
  const previousCartCountRef = useRef(0)
  const [charges, setCharges] = useState({
    tax_enabled: false,
    tax_rate: 0,
    service_enabled: false,
    service_rate: 0
  })

  useEffect(() => {
    if (!loading && business) {
      fetchProducts()
      fetchCharges()
    }
  }, [loading, business])

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    const previousCartCount = previousCartCountRef.current
    let frameId = 0
    let timeoutId = 0

    if (cart.length > 0) {
      setRenderMobileCheckout(true)
      if (previousCartCount === 0) {
        setAnimateMobileCheckout(false)
        frameId = window.requestAnimationFrame(() => {
          setAnimateMobileCheckout(true)
        })
        timeoutId = window.setTimeout(() => {
          setAnimateMobileCheckout(false)
        }, 320)
      }
    } else {
      setAnimateMobileCheckout(false)
      setRenderMobileCheckout(false)
    }

    previousCartCountRef.current = cart.length

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [cart.length])

  useEffect(() => {
    let frameId = 0

    if (showCartSheet) {
      setRenderCartSheet(true)
      frameId = window.requestAnimationFrame(() => {
        setShowCartSheetContent(true)
      })
    } else {
      setShowCartSheetContent(false)
      setRenderCartSheet(false)
    }

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [showCartSheet])

  const fetchCharges = async () => {
    if (!business) return
    try {
      const cacheKey = `charges:${business.id}`
      const cached = getClientCache<typeof charges>(cacheKey)
      if (cached) {
        setCharges(cached)
      }

      const res = await fetch(`/api/settings?business_id=${business.id}`)
      if (res.ok) {
        const data = await res.json()
        const nextCharges = {
          tax_enabled: data.tax_enabled === true || data.tax_enabled === 'true',
          tax_rate: Number(data.tax_rate) || 0,
          service_enabled: data.service_enabled === true || data.service_enabled === 'true',
          service_rate: Number(data.service_rate) || 0
        }
        setCharges(nextCharges)
        setClientCache(cacheKey, nextCharges)
      }
    } catch (error) {
      console.error('Error fetching charges:', error)
    }
  }

  const fetchProducts = async () => {
    if (!business) return
    try {
      setProductsLoading(true)
      const params = new URLSearchParams({
        business_id: business.id,
        page: '1',
        limit: '1000'
      })
      const res = await fetch(`/api/products?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setProductsLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, qty } : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setSelectedMember(null)
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0)
  const pointsToEarn = Math.floor(cartTotal / 10000)
  const memberPoints = selectedMember?.points || 0
  const estimatedTax = charges.tax_enabled ? Math.round((cartTotal * charges.tax_rate) / 100) : 0
  const estimatedService = charges.service_enabled ? Math.round((cartTotal * charges.service_rate) / 100) : 0
  const estimatedTotal = cartTotal + estimatedTax + estimatedService

  const mobileCheckoutUi = (
    <>
      {renderMobileCheckout && (
        <div
          className={`md:hidden fixed left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-50/95 to-transparent ${animateMobileCheckout ? 'mobile-checkout-enter' : ''}`}
          style={{
            bottom: 'calc(var(--app-mobile-nav-height) + env(safe-area-inset-bottom, 0px) + 0.875rem)',
          }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.6)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/70 via-white/20 to-white/50" />
            <div className="relative flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setShowCartSheet(true)}
                className="flex items-center gap-3 text-left flex-1"
              >
                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm">
                  <ShoppingCart size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-gray-500">Checkout</p>
                  <p className="text-sm font-semibold text-gray-900">{formatIDR(estimatedTotal)}</p>
                  <p className="text-[11px] text-gray-500">{cart.reduce((sum, item) => sum + item.qty, 0)} items</p>
                </div>
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0 || processing}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {renderCartSheet && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className={`absolute inset-0 bg-black/50 ${
              showCartSheetContent ? 'mobile-sheet-overlay-enter' : 'mobile-sheet-overlay-exit'
            }`}
            onClick={() => setShowCartSheet(false)}
          />
          <div
            className={`absolute left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col origin-bottom ${
              showCartSheetContent ? 'mobile-sheet-enter' : 'mobile-sheet-exit'
            }`}
            style={{
              bottom: 'calc(var(--app-mobile-nav-height) + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-gray-200" />
            </div>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Current Order</h3>
              <button
                onClick={() => setShowCartSheet(false)}
                className="text-sm text-gray-500"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart size={40} strokeWidth={1.5} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm">{item.product.name}</p>
                        <p className="text-xs text-gray-500">{formatIDR(item.product.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.product.id, item.qty - 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-medium text-sm">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.product.id, item.qty + 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 space-y-3">
              <button
                onClick={() => setShowMemberModal(true)}
                className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left flex items-center gap-3"
              >
                <User size={18} strokeWidth={2} className="text-gray-600" />
                {selectedMember ? (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{selectedMember.name}</p>
                    <p className="text-xs text-gray-500">{selectedMember.phone} • {selectedMember.points} pts</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 flex-1 text-sm">
                    <span className="font-medium">Add Member (Optional)</span>
                  </div>
                )}
              </button>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatIDR(cartTotal)}</span>
                </div>
                {charges.tax_enabled && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax ({charges.tax_rate}%)</span>
                    <span className="font-medium">{formatIDR(estimatedTax)}</span>
                  </div>
                )}
                {charges.service_enabled && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Service ({charges.service_rate}%)</span>
                    <span className="font-medium">{formatIDR(estimatedService)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-green-600">
                  <span>Points to Earn</span>
                  <span className="font-medium">{pointsToEarn} pts</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-gray-900">{formatIDR(estimatedTotal)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-sm"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCartSheet(false)
                    setShowPaymentModal(true)
                  }}
                  disabled={cart.length === 0 || processing}
                  className="flex-1 py-3 bg-gray-900 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )

  const handleCheckout = async (paymentMethod: string, redeemPoints: number) => {
    if (!business || cart.length === 0) return

    setProcessing(true)
    try {
      const pointsUsed = Math.min(Math.max(0, redeemPoints), memberPoints)
      const discount = pointsUsed * 100
      const taxableBase = Math.max(cartTotal - discount, 0)
      const taxAmount = charges.tax_enabled ? Math.round((taxableBase * charges.tax_rate) / 100) : 0
      const serviceAmount = charges.service_enabled ? Math.round((taxableBase * charges.service_rate) / 100) : 0
      const finalTotal = taxableBase + taxAmount + serviceAmount

      const orderData = {
        business_id: business.id,
        total: finalTotal,
        payment_method: paymentMethod,
        member_id: selectedMember?.id || null,
        points_earned: pointsToEarn,
        points_used: pointsUsed,
        discount,
        items: cart.map(item => ({
          product_id: item.product.id,
          qty: item.qty,
          price: item.product.price
        }))
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Checkout failed')
      }

      const order = await res.json()
      
      // Show success and print receipt
      if (window.confirm('Order successful! Print receipt?')) {
        // Redirect to orders page with print option
        router.push(`/orders?id=${order.id}&print=true`)
      } else {
        router.push('/orders')
      }
    } catch (error: any) {
      alert(error.message || 'Checkout failed')
    } finally {
      setProcessing(false)
      setShowPaymentModal(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Products Section - Scrollable */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 pb-28 md:pb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Point of Sale</h1>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm md:text-base w-40 md:w-64"
                  />
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm md:text-base font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All Products' : category}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {productsLoading && filteredProducts.length === 0 ? (
              <div className="text-gray-400">Loading products...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
                {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                  className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 hover:shadow-md hover:border-gray-300 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg mb-3 flex items-center justify-center">
                    <Package className="text-gray-400" size={32} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 truncate text-sm md:text-base">{product.name}</h3>
                  <p className="text-xs md:text-sm text-gray-500 mb-2">{product.category}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-bold text-sm md:text-base">{formatIDR(product.price)}</span>
                    <span className={`text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {product.stock > 0 ? `${product.stock}` : 'OOS'}
                    </span>
                  </div>
                </button>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Package size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-20" />
                <p>No products found</p>
                <button
                  onClick={() => router.push('/products')}
                  className="mt-4 text-gray-900 hover:underline font-medium"
                >
                  Add your first product
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Section - STICKY, tidak ikut scroll */}
      <div className="hidden md:flex flex-col bg-white border-l border-gray-200" style={{ width: 'min(420px, 35vw)' }}>
        <div className="h-full flex flex-col relative">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} strokeWidth={2} className="text-gray-700" />
                <h2 className="text-lg md:text-xl font-bold text-gray-900">Current Order</h2>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-500 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Cart Items - Scrollable area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm md:text-base">Cart is empty</p>
                <p className="text-xs md:text-sm mt-2">Click products to add</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm md:text-base">{item.product.name}</p>
                      <p className="text-xs md:text-sm text-gray-500">{formatIDR(item.product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-medium text-sm">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member Selection */}
          <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
            <button
              onClick={() => setShowMemberModal(true)}
              className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left flex items-center gap-3"
            >
              <User size={18} strokeWidth={2} className="text-gray-600" />
              {selectedMember ? (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">{selectedMember.name}</p>
                  <p className="text-xs text-gray-500">{selectedMember.phone} • {selectedMember.points} pts</p>
                </div>
              ) : (
                <div className="text-center text-gray-500 flex-1 text-sm">
                  <span className="font-medium">Add Member (Optional)</span>
                </div>
              )}
            </button>
          </div>

          {/* Checkout Section - ALWAYS VISIBLE */}
          <div className="p-6 md:p-7 border-t border-gray-200 bg-gray-50 shadow-xl flex-shrink-0">
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatIDR(cartTotal)}</span>
              </div>
              {charges.tax_enabled && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({charges.tax_rate}%)</span>
                  <span className="font-medium">{formatIDR(estimatedTax)}</span>
                </div>
              )}
              {charges.service_enabled && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Service ({charges.service_rate}%)</span>
                  <span className="font-medium">{formatIDR(estimatedService)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-green-600">
                <span>Points to Earn</span>
                <span className="font-medium">{pointsToEarn} pts</span>
              </div>
              <div className="border-t pt-3 flex items-end justify-between">
                <span className="text-base font-semibold text-gray-700">Total</span>
                <span className="text-2xl font-bold text-gray-900">{formatIDR(estimatedTotal)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0 || processing}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <CreditCard size={20} />
              {processing ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>

      {portalReady ? createPortal(mobileCheckoutUi, document.body) : null}

      {/* Member Search Modal */}
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={cartTotal}
          points={memberPoints}
          member={selectedMember}
          taxEnabled={charges.tax_enabled}
          taxRate={charges.tax_rate}
          serviceEnabled={charges.service_enabled}
          serviceRate={charges.service_rate}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleCheckout}
          onAddMember={(newMember) => {
            setSelectedMember(newMember)
          }}
        />
      )}
    </div>
  )
}
