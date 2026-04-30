'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  PAYMENT_METHOD_OPTIONS,
  formatPaymentDisplay,
} from '@/lib/payments'
import { supabase } from '@/lib/supabase'
import { formatIDR, toLocalISODate } from '@/lib/utils'
import ReceiptPrinter from '@/components/ReceiptPrinter'
import { Search, ShoppingCart, TrendingUp, DollarSign, Loader2, FileText } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateFilterSelect } from "@/components/ui/date-filter-select"
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

interface ReceiptSettings {
  receipt_header: string
  receipt_footer: string
  receipt_paper_size: '58mm' | '80mm'
  tax_enabled: boolean
  tax_rate: number
  service_enabled: boolean
  service_rate: number
  business_name?: string
  business_address?: string
  business_phone?: string
}

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
  const [fetching, setFetching] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null)
  const getToday = () => {
    const now = new Date()
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      week: '',
      day: String(now.getDate()).padStart(2, '0')
    }
  }
  const [dateFilter, setDateFilter] = useState(getToday)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [summaryTotalRevenue, setSummaryTotalRevenue] = useState(0)
  const [summaryTotalOrders, setSummaryTotalOrders] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('all')
  
  const tokenRef = useRef<string>('')
  const fetchIdRef = useRef(0)
  const [tokenReady, setTokenReady] = useState(false)

  const limit = 20
  const isLoading = loading || fetching

  // Debounce search — 350ms
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Cache session token — gate data fetches until token is ready to avoid auth races
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      tokenRef.current = session?.access_token || ''
      setTokenReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      tokenRef.current = session?.access_token || ''
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (business && tokenReady) {
      fetchOrders()
      fetchReceiptSettings()
      const printParam = searchParams.get('print')
      const orderId = searchParams.get('id')
      if (printParam === 'true' && orderId) fetchOrderDetail(orderId)
    }
  }, [loading, business, tokenReady, dateFilter, page, debouncedSearch, paymentMethod])

  const fetchReceiptSettings = async () => {
    if (!business) return
    try {
      const res = await fetch(`/api/settings?business_id=${business.id}`, {
        headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}
      })
      if (res.ok) setReceiptSettings(await res.json())
    } catch { }
  }

  const fetchOrders = useCallback(async () => {
    if (!business) return
    const fetchId = ++fetchIdRef.current
    // Only show loading if we don't have any orders yet
    if (orders.length === 0) setFetching(true)
    try {
      let startDate = ''
      let endDate = ''

      // Convert dateFilter to startDate/endDate
      if (dateFilter.year) {
        if (dateFilter.month) {
          const month = dateFilter.month.padStart(2, '0')
          if (dateFilter.week) {
            // Week specific - calculate start/end of week
            const year = parseInt(dateFilter.year)
            const monthNum = parseInt(dateFilter.month)
            const weekNum = parseInt(dateFilter.week)
            const firstDayOfMonth = new Date(year, monthNum - 1, 1)
            const firstSunday = new Date(firstDayOfMonth)
            firstSunday.setDate(firstSunday.getDate() + (7 - firstSunday.getDay()) % 7)
            const weekStart = new Date(firstSunday)
            weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 6)
            startDate = toLocalISODate(weekStart)
            endDate = toLocalISODate(weekEnd)
          } else if (dateFilter.day) {
            // Specific day
            startDate = `${dateFilter.year}-${month}-${dateFilter.day.padStart(2, '0')}`
            endDate = startDate
          } else {
            // All month
            startDate = `${dateFilter.year}-${month}-01`
            const lastDay = new Date(parseInt(dateFilter.year), parseInt(dateFilter.month), 0).getDate()
            endDate = `${dateFilter.year}-${month}-${lastDay}`
          }
        } else {
          // All year
          startDate = `${dateFilter.year}-01-01`
          endDate = `${dateFilter.year}-12-31`
        }
      }

      const url = buildOrdersApiUrl({ businessId: business.id, page, limit, startDate, endDate, paymentMethod, searchQuery: debouncedSearch })
      const res = await fetch(url, { headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {} })
      if (res.ok && fetchId === fetchIdRef.current) {
        const result = await res.json()
        setOrders(result.data || [])
        setTotal(result.total || 0)
        setSummaryTotalRevenue(result.summary?.totalRevenue || 0)
        setSummaryTotalOrders(result.summary?.totalOrders || 0)
      }
    } catch { } finally {
      if (fetchId === fetchIdRef.current) setFetching(false)
    }
  }, [business, dateFilter, page, debouncedSearch, paymentMethod])

  const fetchOrderDetail = async (orderId: string) => {
    if (!business) return
    try {
      const res = await fetch(`/api/orders/${orderId}?business_id=${business.id}`, { headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {} })
      if (res.ok) {
        setSelectedOrder(await res.json())
        setShowReceipt(true)
      }
    } catch { }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  function buildOrdersApiUrl(params: any) {
    const url = new URL('/api/orders', window.location.origin)
    url.searchParams.set('business_id', params.businessId)
    url.searchParams.set('page', String(params.page || 1))
    url.searchParams.set('limit', String(params.limit || limit))
    if (params.startDate && params.endDate) {
      url.searchParams.set('startDate', params.startDate)
      url.searchParams.set('endDate', params.endDate)
    }
    if (params.paymentMethod !== 'all') url.searchParams.set('payment_method', params.paymentMethod)
    if (params.searchQuery) url.searchParams.set('q', params.searchQuery)
    return `${url.pathname}${url.search}`
  }

  const handleDownloadReport = async () => {
    if (!business) return
    const reportParams = new URLSearchParams({ business_id: business.id })
    if (paymentMethod !== 'all') reportParams.set('payment_method', paymentMethod)
    if (searchQuery) reportParams.set('q', searchQuery)
    
    // Use dateFilter to calculate startDate/endDate
    if (dateFilter.year) {
      if (dateFilter.month) {
        const month = dateFilter.month.padStart(2, '0')
        if (dateFilter.week) {
          const year = parseInt(dateFilter.year)
          const monthNum = parseInt(dateFilter.month)
          const weekNum = parseInt(dateFilter.week)
          const firstDayOfMonth = new Date(year, monthNum - 1, 1)
          const firstSunday = new Date(firstDayOfMonth)
          firstSunday.setDate(firstSunday.getDate() + (7 - firstSunday.getDay()) % 7)
          const weekStart = new Date(firstSunday)
          weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          reportParams.set('startDate', toLocalISODate(weekStart))
          reportParams.set('endDate', toLocalISODate(weekEnd))
        } else if (dateFilter.day) {
          const day = dateFilter.day.padStart(2, '0')
          reportParams.set('startDate', `${dateFilter.year}-${month}-${day}`)
          reportParams.set('endDate', `${dateFilter.year}-${month}-${day}`)
        } else {
          reportParams.set('startDate', `${dateFilter.year}-${month}-01`)
          const lastDay = new Date(parseInt(dateFilter.year), parseInt(dateFilter.month), 0).getDate()
          reportParams.set('endDate', `${dateFilter.year}-${month}-${lastDay}`)
        }
      } else {
        reportParams.set('startDate', `${dateFilter.year}-01-01`)
        reportParams.set('endDate', `${dateFilter.year}-12-31`)
      }
    }
    
    router.push(`/orders/report?${reportParams.toString()}`)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-black tracking-tight uppercase">Transactions</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">History &amp; Reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadReport} disabled={isLoading} className="h-10 px-6 rounded-xl font-black bg-slate-900 text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:scale-105 active:scale-95">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
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
              <Input placeholder="Search ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 text-xs bg-white rounded-xl border-slate-200 shadow-sm" />
            </div>
            
            <div className="flex items-center gap-2">
              <DateFilterSelect 
                value={dateFilter} 
                onChange={(val) => { setDateFilter(val); setPage(1); }} 
              />
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

        <div className="overflow-x-auto relative">
          {fetching && orders.length > 0 && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center pointer-events-none">
              <Loader2 className="animate-spin text-slate-300 h-5 w-5" />
            </div>
          )}
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-none">
                <TableHead className="py-4 pl-6 text-[11px] uppercase font-black text-slate-400 tracking-widest">Order ID</TableHead>
                <TableHead className="text-[11px] uppercase font-black text-slate-400 tracking-widest">Date</TableHead>
                <TableHead className="text-[11px] uppercase font-black text-slate-400 tracking-widest">Customer</TableHead>
                <TableHead className="text-[11px] uppercase font-black text-slate-400 tracking-widest">Payment</TableHead>
                <TableHead className="text-[11px] uppercase font-black text-slate-400 tracking-widest">Total</TableHead>
                <TableHead className="text-right pr-6 text-[11px] uppercase font-black text-slate-400 tracking-widest">Action</TableHead>
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
                    <TableCell className="text-sm font-bold text-slate-700">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      <span className="ml-1.5 font-normal text-slate-400">{new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="text-sm font-bold text-slate-800">{order.member?.name || 'Walk-in'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 font-black text-[9px] uppercase px-2 py-0.5 border-slate-200">
                        {formatPaymentDisplay(order.payment_method, order.payment_provider)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-black text-slate-900">{formatIDR(order.total)}</TableCell>
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
        <ReceiptPrinter order={selectedOrder} businessId={business?.id} customSettings={receiptSettings ?? undefined} onClose={() => { setShowReceipt(false); setSelectedOrder(null); router.push('/orders'); }} />
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
