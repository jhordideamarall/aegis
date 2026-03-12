'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { formatIDR, toLocalISODate } from '@/lib/utils'
import ReceiptPrinter from '@/components/ReceiptPrinter'
import { ChevronLeft, ChevronRight } from 'react-feather'

interface Order {
  id: string
  business_id: string
  member_id: string | null
  total: number
  payment_method: string
  points_earned: number
  points_used: number
  discount: number
  created_at: string
  order_items: {
    id: string
    product_id: string
    qty: number
    price: number
    product?: { name: string }
  }[]
  member: {
    id: string
    name: string
    phone: string
  } | null
}

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { business, loading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [fetching, setFetching] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'custom'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [summaryTotalRevenue, setSummaryTotalRevenue] = useState(0)
  const [summaryTotalOrders, setSummaryTotalOrders] = useState(0)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('all')
  const limit = 20
  const isLoading = loading || fetching

  useEffect(() => {
    if (!loading && business) {
      fetchOrders()

      // Check if we should print receipt (from POS checkout)
      const printParam = searchParams.get('print')
      const orderId = searchParams.get('id')
      if (printParam === 'true' && orderId) {
        fetchOrderDetail(orderId)
      }
    }
  }, [loading, business, filter, page, searchQuery, startDate, endDate, paymentMethod, searchParams])

  const fetchOrders = async () => {
    if (!business) return
    try {
      const today = toLocalISODate()
      const weekAgo = toLocalISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

      const cacheKey = `orders:${business.id}:${filter}:${page}:${today}:${weekAgo}:${searchQuery}:${startDate}:${endDate}:${paymentMethod}`
      const cached = getClientCache<{ data: Order[]; total: number; summaryTotalRevenue: number; summaryTotalOrders: number }>(cacheKey)
      if (cached) {
        console.log('Using cached orders:', cached.data.length)
        setOrders(cached.data)
        setTotal(cached.total)
        setSummaryTotalRevenue(cached.summaryTotalRevenue)
        setSummaryTotalOrders(cached.summaryTotalOrders)
        setFetching(false)
      } else {
        setFetching(true)
      }

      let url = `/api/orders?business_id=${business.id}&page=${page}&limit=${limit}`
      if (filter === 'today') {
        url += `&startDate=${today}&endDate=${today}`
      }
      if (filter === 'week') {
        url += `&startDate=${weekAgo}&endDate=${today}`
      }
      if (filter === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      if (paymentMethod !== 'all') {
        url += `&payment_method=${encodeURIComponent(paymentMethod)}`
      }
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`

      console.log('Fetching orders from:', url)
      const res = await fetch(url)
      if (res.ok) {
        const result = await res.json()
        console.log('Orders result:', result.data?.length, 'total:', result.total)
        setOrders(result.data || [])
        setTotal(result.total || 0)
        setSummaryTotalRevenue(result.summary?.totalRevenue || 0)
        setSummaryTotalOrders(result.summary?.totalOrders || 0)
        setClientCache(cacheKey, {
          data: result.data || [],
          total: result.total || 0,
          summaryTotalRevenue: result.summary?.totalRevenue || 0,
          summaryTotalOrders: result.summary?.totalOrders || 0
        })
      } else {
        console.error('Failed to fetch orders:', res.status)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setFetching(false)
    }
  }

  const fetchOrderDetail = async (orderId: string) => {
    if (!business) return
    try {
      const res = await fetch(`/api/orders/${orderId}?business_id=${business.id}`)
      if (res.ok) {
        const order = await res.json()
        setSelectedOrder(order)
        setShowReceipt(true)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    }
  }

  const getStatusColor = (paymentMethod: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-700',
      debit: 'bg-blue-100 text-blue-700',
      credit: 'bg-purple-100 text-purple-700',
      gopay: 'bg-cyan-100 text-cyan-700',
      ovo: 'bg-purple-100 text-purple-700',
      dana: 'bg-blue-100 text-blue-700'
    }
    return colors[paymentMethod] || 'bg-gray-100 text-gray-700'
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)
  const averageOrderValue = summaryTotalOrders > 0 ? summaryTotalRevenue / summaryTotalOrders : 0

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Orders</h1>
          <p className="text-gray-500">View and manage all transactions</p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full md:w-56 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setFilter('all')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setFilter('today')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'today' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  setFilter('week')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'week' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => {
                  setFilter('custom')
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'custom' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Custom Range
              </button>
            </div>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="all">All Payment</option>
              <option value="cash">Cash</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
              <option value="gopay">GoPay</option>
              <option value="ovo">OVO</option>
              <option value="dana">DANA</option>
            </select>
          </div>
          {filter === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600 font-medium">Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                max={toLocalISODate()}
              />
            </div>
          )}
        </div>
      </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-800">{summaryTotalOrders}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatIDR(summaryTotalRevenue)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Average Order Value</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatIDR(averageOrderValue)}
                </p>
              </div>
            </div>

            {/* Orders List (Mobile) */}
            <div className="md:hidden space-y-3">
              {orders.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-gray-400">
                  {isLoading ? 'Loading orders...' : 'No orders yet'}
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(order.payment_method)}`}>
                        {order.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.member ? order.member.name : 'General Customer'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}{' '}
                          •{' '}
                          {new Date(order.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{formatIDR(order.total)}</p>
                        <button
                          onClick={() => fetchOrderDetail(order.id)}
                          className="text-xs text-blue-600 hover:underline mt-1"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Orders Table (Desktop) */}
            <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date & Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Items</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Payment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <div className="text-6xl mb-4">📋</div>
                    <p>No orders yet</p>
                    <button
                      onClick={() => router.push('/pos')}
                      className="mt-4 text-blue-600 hover:underline"
                    >
                      Create your first order
                    </button>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {new Date(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.member ? (
                        <div>
                          <p className="font-medium text-gray-800">{order.member.name}</p>
                          <p className="text-sm text-gray-500">{order.member.phone}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">General</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-800">{order.order_items.length} items</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(order.payment_method)}`}>
                        {order.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-600">{formatIDR(order.total)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => fetchOrderDetail(order.id)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {orders.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {startItem}-{endItem} of {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      
      {/* Receipt Modal */}
      {showReceipt && selectedOrder && (
        <ReceiptPrinter
          order={selectedOrder}
          businessId={business?.id}
          onClose={() => {
            setShowReceipt(false)
            setSelectedOrder(null)
            // Clear URL params
            router.push('/orders')
          }}
        />
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading orders...
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}
