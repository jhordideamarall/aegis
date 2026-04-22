'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { formatPaymentDisplay, getPaymentMethodLabel } from '@/lib/payments'
import { supabase } from '@/lib/supabase'
import { DEFAULT_TIME_ZONE, formatIDR, toLocalISODate } from '@/lib/utils'
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Award,
  Clock,
  DollarSign,
  Wallet,
  Loader2,
  Calendar as CalendarIcon
} from 'lucide-react'
import { DateRangePicker } from '@/components/DateRangePicker'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DashboardData {
  totalSales: number
  totalOrders: number
  totalItems: number
  totalNetProfit: number
  prevTotalSales: number
  prevTotalOrders: number
  prevTotalNetProfit: number
  newMembers: number
  prevNewMembers: number
  totalProducts: number
  totalMembers: number
  topProducts: Array<{ id: string; name: string; qty: number; revenue: number }>
  topMembers: Array<{ id: string; name: string; phone: string; total: number; orders: number }>
  salesChart: Array<{ date: string; sales: number; profit: number }>
  paymentMethods: Record<string, number>
  orders: any[]
}

const chartConfig = {
  sales: {
    label: "Revenue",
    color: "#0f172a",
  },
  profit: {
    label: "Net Profit",
    color: "#475569",
  },
}

function formatChartDateLabel(dateKey: string): string {
  if (dateKey.includes('T')) {
    const hour = dateKey.split('T')[1]?.slice(0, 2) || '00'
    return `${Number(hour)}:00`
  }

  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) {
    return dateKey
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: DEFAULT_TIME_ZONE
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)))
}

export default function DashboardPage() {
  const { business, loading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [chartMode, setChartMode] = useState<'sales' | 'profit'>('sales')
  
  const [customDate, setCustomDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  })
  
  const isLoading = loading || fetching

  const fetchDashboard = useCallback(async () => {
    if (!business) {
      setFetching(false)
      return
    }
    let startDate: string
    let endDate: string

    if (dateRangeFilter === 'custom') {
      startDate = customDate?.from ? toLocalISODate(customDate.from) : toLocalISODate()
      endDate = customDate?.to ? toLocalISODate(customDate.to) : startDate
    } else {
      const now = new Date()

      if (dateRangeFilter === 'today') {
        startDate = toLocalISODate(now)
        endDate = toLocalISODate(now)
      } else if (dateRangeFilter === 'week') {
        const currentDay = now.getDay()
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay)
        startDate = toLocalISODate(weekStart)
        endDate = toLocalISODate(now)
      } else { 
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = toLocalISODate(monthStart)
        endDate = toLocalISODate(now)
      }
    }

    const cacheKey = `dashboard:${business.id}:${startDate}:${endDate}`
    const cached = getClientCache<DashboardData>(cacheKey)
    if (cached) {
      setData(cached)
      setFetching(false)
    } else {
      setFetching(true)
    }

    try {
      const url = `/api/dashboard?business_id=${business.id}&startDate=${startDate}&endDate=${endDate}`
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(url, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}
      })
      if (res.ok) {
        const result = await res.json()
        setData(result)
        setClientCache(cacheKey, result)
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setFetching(false)
    }
  }, [business, dateRangeFilter, customDate])

  useEffect(() => {
    if (!loading && business) {
      fetchDashboard()
    }
  }, [loading, business, dateRangeFilter, customDate, fetchDashboard])

  const buildTrend = (current: number, previous: number) => {
    if (previous === 0) return { label: '0%', direction: 'neutral' as const }
    const change = ((current - previous) / previous) * 100
    const rounded = Math.round(change)
    return {
      label: `${rounded > 0 ? '+' : ''}${rounded}%`,
      direction: rounded > 0 ? ('up' as const) : rounded < 0 ? ('down' as const) : ('neutral' as const)
    }
  }

  const salesTrend = data ? buildTrend(data.totalSales, data.prevTotalSales) : null
  const ordersTrend = data ? buildTrend(data.totalOrders, data.prevTotalOrders) : null
  const profitTrend = data ? buildTrend(data.totalNetProfit, data.prevTotalNetProfit) : null
  const membersTrend = data ? buildTrend(data.newMembers, data.prevNewMembers) : null

  const chartData = data?.salesChart?.map(item => {
    return { date: formatChartDateLabel(item.date), sales: item.sales, profit: item.profit }
  }) || []

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Analytics</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Real-time Performance</p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner transition-all">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'custom', label: 'Range' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDateRangeFilter(opt.id as any)}
              className={`px-4 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${
                dateRangeFilter === opt.id 
                  ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          
          {dateRangeFilter === 'custom' && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-500 ml-1">
              <DateRangePicker 
                date={customDate} 
                onDateChange={setCustomDate} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        <StatCard title="Revenue" value={formatIDR(data?.totalSales || 0)} icon={TrendingUp} trend={salesTrend} />
        <StatCard title="Net Profit" value={formatIDR(data?.totalNetProfit || 0)} icon={Wallet} trend={profitTrend} dark />
        <StatCard title="Total Orders" value={data?.totalOrders || 0} icon={ShoppingBag} trend={ordersTrend} />
        <StatCard title="New Members" value={data?.newMembers || 0} icon={Users} trend={membersTrend} />
      </div>

      {/* Sales Performance Chart */}
      <Card className="border-slate-200 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.45)] rounded-3xl overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between py-5 px-8 border-b bg-white/90">
          <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Sales Performance</CardTitle>
          <Tabs value={chartMode} onValueChange={(val: any) => setChartMode(val)}>
            <TabsList className="h-8 p-1 bg-slate-200 rounded-xl">
              <TabsTrigger value="sales" className="text-[9px] font-black uppercase px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all">Revenue</TabsTrigger>
              <TabsTrigger value="profit" className="text-[9px] font-black uppercase px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all">Profit</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="relative overflow-hidden p-6 md:p-8 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#ecfeff_100%)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.13)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.13)_1px,transparent_1px)] bg-[size:28px_28px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 to-transparent" />
          {isLoading ? (
            <div className="relative h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="relative h-[320px] w-full">
              <ComposedChart data={chartData} margin={{ top: 40, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="#e2e8f0" strokeOpacity={0.6} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  tickMargin={12}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  tickFormatter={(value) => `Rp${(value / 1000).toLocaleString()}k`}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
                />
                <ChartTooltip 
                  cursor={{ fill: 'rgba(241,245,249,0.7)', radius: 8 }}
                  content={<ChartTooltipContent hideLabel indicator="line" formatter={(v) => formatIDR(v as number)} />} 
                />
                <Bar 
                  dataKey={chartMode} 
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                  animationDuration={1000}
                >
                  {(() => {
                    const maxValue = Math.max(...chartData.map((d: any) => d[chartMode]), 0)
                    return chartData.map((entry: any, index: number) => {
                      const val = entry[chartMode]
                      let color = '#f59e0b' // Low (Amber/Yellow)
                      if (val > 0 && val >= maxValue * 0.7) color = '#8b5cf6' // High (Violet/Purple)
                      else if (val > 0 && val >= maxValue * 0.3) color = '#10b981' // Mid (Emerald/Green)
                      return <Cell key={`cell-${index}`} fill={color} />
                    })
                  })()}
                </Bar>
                <Line
                  type="monotone"
                  dataKey={chartMode}
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={{ r: 4, stroke: '#0f172a', strokeWidth: 2.5, fill: '#ffffff' }}
                  activeDot={{ r: 6, stroke: '#000000', strokeWidth: 3, fill: '#ffffff' }}
                  animationBegin={120}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  connectNulls
                />
              </ComposedChart>
            </ChartContainer>
          ) : (
            <div className="relative h-[300px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed rounded-2xl border-slate-100 bg-white/60">
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">No performance data</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
        {/* Payment Methods */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="py-5 px-8 border-b bg-slate-50/30">
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {data?.paymentMethods && Object.entries(data.paymentMethods).map(([method, count]) => {
                const total = Object.values(data.paymentMethods).reduce((a, b) => a + b, 0)
                const percentage = (count / total) * 100
                return (
                  <div key={method} className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <span>{getPaymentMethodLabel(method)}</span>
                      <span className="text-slate-400">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                      <div className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
              {(!data?.paymentMethods || Object.keys(data.paymentMethods).length === 0) && (
                <p className="text-center py-10 text-[10px] text-slate-300 font-black uppercase tracking-widest">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Feed */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="py-5 px-8 border-b bg-slate-50/30 flex flex-row items-center gap-3">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Live Activity</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableBody>
                {data?.orders && data.orders.length > 0 ? (
                  data.orders.slice(0, 5).map((order) => (
                    <TableRow key={order.id} className="border-slate-50 hover:bg-slate-50/80 transition-all duration-300 group">
                      <TableCell className="py-4 pl-8 font-black text-slate-300 text-[10px] uppercase">
                        {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="font-black text-slate-700 text-xs uppercase tracking-tight">{order.member?.name || 'Walk-in'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-5 px-2 border-slate-200 text-slate-400 group-hover:border-slate-400 transition-all">{getPaymentMethodLabel(order.payment_method)}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8 font-black text-slate-900 text-xs">{formatIDR(order.total)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell className="h-40 text-center text-[10px] text-slate-300 font-black uppercase tracking-widest">Waiting for transactions...</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, trend, dark }: { title: string, value: any, icon: any, trend: any, dark?: boolean }) {
  const TrendIcon = trend?.direction === 'down' ? ArrowDownRight : trend?.direction === 'up' ? ArrowUpRight : ArrowRight
  return (
    <Card className={`border-slate-200 shadow-sm rounded-[2rem] ${dark ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200' : 'bg-white text-slate-900'} transition-all hover:translate-y-[-4px] duration-500 cursor-default group`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${dark ? 'text-slate-400' : 'text-slate-400'}`}>{title}</p>
            <p className="text-2xl font-black tracking-tight group-hover:scale-105 transition-transform duration-500 origin-left">{value}</p>
          </div>
          <div className={`p-3 rounded-2xl transition-all duration-500 group-hover:rotate-12 ${dark ? 'bg-white/10' : 'bg-slate-50'}`}>
            <Icon size={18} className={dark ? 'text-white' : 'text-slate-400'} />
          </div>
        </div>
        {trend && (
          <div className="mt-5 flex items-center gap-2">
            <div className={`flex items-center text-[10px] font-black px-2.5 py-1 rounded-xl shadow-sm ${
              trend.direction === 'up' ? (dark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-100') :
              trend.direction === 'down' ? (dark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-100') : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              <TrendIcon size={10} className="mr-1 stroke-[3.5px]" /> {trend.label}
            </div>
            <span className={`text-[9px] font-black ${dark ? 'text-slate-500' : 'text-slate-300'} uppercase tracking-[0.1em]`}>Growth</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
