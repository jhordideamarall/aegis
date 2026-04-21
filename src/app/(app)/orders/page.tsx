'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import {
  PAYMENT_METHOD_OPTIONS,
  formatPaymentDisplay,
  getPaymentMethodBadgeColor
} from '@/lib/payments'
import { supabase } from '@/lib/supabase'
import { formatIDR, toLocalISODate } from '@/lib/utils'
import ReceiptPrinter from '@/components/ReceiptPrinter'
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Loader2, 
  Clock 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Order {
  id: string
  business_id: string
  member_id: string | null
  total: number
  payment_method: string
  payment_provider?: string | null
  payment_proof_url?: string | null
  payment_proof_path?: string | null
  payment_proof_uploaded_at?: string | null
  payment_notes?: string | null
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
      const printParam = searchParams.get('print')
      const orderId = searchParams.get('id')
      if (printParam === 'true' && orderId) fetchOrderDetail(orderId)
    }
  }, [loading, business, filter, page, searchQuery, startDate, endDate, paymentMethod, searchParams])

  const fetchOrders = async () => {
    if (!business) return
    try {
      const today = toLocalISODate()
      const url = buildOrdersApiUrl({ businessId: business.id, page, limit, today, filter, startDate, endDate, paymentMethod, searchQuery })
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(url, { headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {} })
      if (res.ok) {
        const result = await res.json()
        setOrders(result.data || [])
        setTotal(result.total || 0)
        setSummaryTotalRevenue(result.summary?.totalRevenue || 0)
        setSummaryTotalOrders(result.summary?.totalOrders || 0)
      }
    } catch (error) {} finally { setFetching(false) }
  }

  const fetchOrderDetail = async (orderId: string) => {
    if (!business) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/orders/${orderId}?business_id=${business.id}`, { headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {} })
      if (res.ok) {
        setSelectedOrder(await res.json())
        setShowReceipt(true)
      }
    } catch (error) {}
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  function buildOrdersApiUrl(params: any) {
    const url = new URL('/api/orders', window.location.origin)
    url.searchParams.set('business_id', params.businessId)
    url.searchParams.set('page', String(params.page || 1))
    url.searchParams.set('limit', String(params.limit || limit))
    if (params.filter === 'today') { url.searchParams.set('startDate', params.today); url.searchParams.set('endDate', params.today); }
    if (params.filter === 'custom' && params.startDate && params.endDate) { url.searchParams.set('startDate', params.startDate); url.searchParams.set('endDate', params.endDate); }
    if (params.paymentMethod !== 'all') url.searchParams.set('payment_method', params.paymentMethod)
    if (params.searchQuery) url.searchParams.set('q', params.searchQuery)
    return `${url.pathname}${url.search}`
  }

  const handleDownloadReport = async () => {
    if (!business) return
    const reportParams = new URLSearchParams({ filter, business_id: business.id })
    if (paymentMethod !== 'all') reportParams.set('payment_method', paymentMethod)
    if (searchQuery) reportParams.set('q', searchQuery)
    
    if (filter === 'today') {
      const today = toLocalISODate()
      reportParams.set('startDate', today)
      reportParams.set('endDate', today)
    } else if (filter === 'custom') {
      if (startDate) reportParams.set('startDate', startDate)
      if (endDate) reportParams.set('endDate', endDate)
    }
    
    router.push(`/orders/report?${reportParams.toString()}`)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">History & Reports</p>
        </div>
        <Button onClick={handleDownloadReport} disabled={isLoading} className="h-9 px-4 rounded-lg font-bold bg-slate-900 text-xs">
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsMiniCard title="Total Orders" value={summaryTotalOrders} icon={ShoppingCart} />
        <StatsMiniCard title="Revenue" value={formatIDR(summaryTotalRevenue)} icon={TrendingUp} />
        <StatsMiniCard title="Avg. Ticket" value={formatIDR(summaryTotalOrders > 0 ? summaryTotalRevenue / summaryTotalOrders : 0)} icon={DollarSign} />
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Transaction ID..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9 h-9 text-xs bg-white" />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(val: any) => { setFilter(val); if (val !== 'custom') { setStartDate(''); setEndDate(''); } setPage(1); }}>
                <SelectTrigger className="h-9 w-[120px] text-xs font-bold bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentMethod} onValueChange={(val) => { if (val) { setPaymentMethod(val); setPage(1); } }}>
                <SelectTrigger className="h-9 w-[140px] text-xs font-bold bg-white"><SelectValue placeholder="Method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL METHODS</SelectItem>
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filter === 'custom' && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <CalendarIcon size={14} className="text-slate-400" />
              <div className="flex items-center gap-2">
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-8 text-[10px] w-32 font-bold" />
                <span className="text-slate-300 font-bold">&rarr;</span>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-8 text-[10px] w-32 font-bold" />
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-none">
                <TableHead className="py-3 pl-6 text-[10px] uppercase font-bold text-slate-400">Order ID</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Date</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Customer</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Payment</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Total</TableHead>
                <TableHead className="text-right pr-6 text-[10px] uppercase font-bold text-slate-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && orders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
              ) : orders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-xs text-slate-400 font-medium">No transactions</TableCell></TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="py-3 pl-6 font-mono text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-700">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      <span className="ml-1.5 font-normal text-slate-400">{new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-800">{order.member?.name || 'Walk-in'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-black text-[9px] uppercase px-2 py-0.5 border-none">
                        {formatPaymentDisplay(order.payment_method, order.payment_provider)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-black text-slate-900">{formatIDR(order.total)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button onClick={() => fetchOrderDetail(order.id)} variant="outline" className="h-7 px-3 rounded text-[10px] font-black uppercase tracking-tighter border-slate-200">Details</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {orders.length > 0 && (
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
      
      {showReceipt && selectedOrder && (
        <ReceiptPrinter order={selectedOrder} businessId={business?.id} onClose={() => { setShowReceipt(false); setSelectedOrder(null); router.push('/orders'); }} />
      )}
    </div>
  )
}

function StatsMiniCard({ title, value, icon: Icon }: { title: string, value: any, icon: any }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm group">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
      <div className="flex items-center justify-between">
        <p className="text-lg font-black text-slate-900">{value}</p>
        <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors"><Icon className="h-4 w-4 text-slate-300" /></div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading orders...</div>}><OrdersContent /></Suspense>)
}
