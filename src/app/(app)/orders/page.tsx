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
import { DateRangePicker } from '@/components/DateRangePicker'
import { DateRange } from 'react-day-picker'

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
  const [paymentMethod, setPaymentMethod] = useState<string>('all')
  const [customDate, setCustomDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  })
  
  const limit = 20
  const isLoading = loading || fetching

  useEffect(() => {
    if (!loading && business) {
      fetchOrders()
      const printParam = searchParams.get('print')
      const orderId = searchParams.get('id')
      if (printParam === 'true' && orderId) fetchOrderDetail(orderId)
    }
  }, [loading, business, filter, page, searchQuery, customDate, paymentMethod, searchParams])

  const fetchOrders = async () => {
    if (!business) return
    try {
      const today = toLocalISODate()
      let startDate = ''
      let endDate = ''

      if (filter === 'custom' && customDate?.from) {
        startDate = toLocalISODate(customDate.from)
        endDate = customDate.to ? toLocalISODate(customDate.to) : startDate
      }

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
    } else if (filter === 'custom' && customDate?.from) {
      reportParams.set('startDate', toLocalISODate(customDate.from))
      if (customDate.to) reportParams.set('endDate', toLocalISODate(customDate.to))
    }
    
    router.push(`/orders/report?${reportParams.toString()}`)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-black tracking-tight uppercase">Transactions</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">History & Reports</p>
        </div>
        <Button onClick={handleDownloadReport} disabled={isLoading} className="h-10 px-6 rounded-xl font-black bg-slate-900 text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:scale-105 active:scale-95">
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
              <Input placeholder="Search ID..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9 h-10 text-xs bg-white rounded-xl border-slate-200 shadow-sm" />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'custom', label: 'Range' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setFilter(opt.id as any); setPage(1); }}
                  className={`px-4 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === opt.id 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              
              {filter === 'custom' && (
                <div className="animate-in fade-in zoom-in-95 duration-200 ml-1">
                  <DateRangePicker 
                    date={customDate} 
                    onDateChange={setCustomDate} 
                  />
                </div>
              )}
            </div>

            <Select value={paymentMethod} onValueChange={(val) => { if (val) { setPaymentMethod(val); setPage(1); } }}>
              <SelectTrigger className="h-10 w-full sm:w-[160px] text-xs font-bold bg-white rounded-xl border-slate-200 shadow-sm"><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">ALL METHODS</SelectItem>
                {PAYMENT_METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs font-bold">
                    {o.label.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-none">
                <TableHead className="py-4 pl-6 text-[10px] uppercase font-black text-slate-400 tracking-widest">Order ID</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Customer</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Payment</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total</TableHead>
                <TableHead className="text-right pr-6 text-[10px] uppercase font-black text-slate-400 tracking-widest">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && orders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
              ) : orders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">No transactions found</TableCell></TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 group">
                    <TableCell className="py-4 pl-6 font-mono text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-700">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      <span className="ml-1.5 font-normal text-slate-400">{new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-800">{order.member?.name || 'Walk-in'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 font-black text-[9px] uppercase px-2 py-0.5 border-slate-200">
                        {formatPaymentDisplay(order.payment_method, order.payment_provider)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-black text-slate-900">{formatIDR(order.total)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button onClick={() => fetchOrderDetail(order.id)} variant="ghost" className="h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100 transition-all">Details</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {orders.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-slate-50/30 border-t">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{startItem}-{endItem} <span className="text-slate-200 mx-1">/</span> {total}</p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border-slate-200 bg-white" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <div className="h-9 px-4 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-[10px] font-black shadow-sm">{page} / {totalPages}</div>
              <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border-slate-200 bg-white" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
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
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm group hover:shadow-md transition-all duration-300">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2">{title}</p>
      <div className="flex items-center justify-between">
        <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
        <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all duration-500"><Icon className="h-4 w-4" /></div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Loading orders...</div>}><OrdersContent /></Suspense>)
}
