'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { formatPaymentDisplay, getPaymentMethodLabel } from '@/lib/payments'
import { supabase } from '@/lib/supabase'
import { formatIDR, isSameLocalDate, toLocalISODate } from '@/lib/utils'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis } from 'recharts'
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
    let label = ''
    if (item.date.includes('T')) {
      const hour = new Date(item.date).getHours()
      label = `${hour}:00`
    } else {
      label = new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }
    return { date: label, sales: item.sales, profit: item.profit }
  }) || []

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Performance Insights</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {dateRangeFilter === 'custom' && (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <DateRangePicker 
                date={customDate} 
                onDateChange={setCustomDate} 
              />
            </div>
          )}
          <Select 
            value={dateRangeFilter} 
            onValueChange={(val) => setDateRangeFilter(val as any)}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs font-bold bg-white">
              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Revenue" value={formatIDR(data?.totalSales || 0)} icon={TrendingUp} trend={salesTrend} />
        <StatCard title="Net Profit" value={formatIDR(data?.totalNetProfit || 0)} icon={Wallet} trend={profitTrend} dark />
        <StatCard title="Orders" value={data?.totalOrders || 0} icon={ShoppingBag} trend={ordersTrend} />
        <StatCard title="Members" value={data?.newMembers || 0} icon={Users} trend={membersTrend} />
      </div>

      {/* Sales Performance Chart */}
      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b bg-slate-50/50">
          <CardTitle className="text-sm font-bold">Sales Performance</CardTitle>
          <Tabs value={chartMode} onValueChange={(val: any) => setChartMode(val)}>
            <TabsList className="h-8 p-0.5 bg-slate-200">
              <TabsTrigger value="sales" className="text-[10px] px-3 h-7 data-[state=active]:bg-white">Revenue</TabsTrigger>
              <TabsTrigger value="profit" className="text-[10px] px-3 h-7 data-[state=active]:bg-white">Profit</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                  tickMargin={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }} 
                  tickFormatter={(value) => `Rp${(value / 1000).toLocaleString()}k`}
                />
                <ChartTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={<ChartTooltipContent hideLabel indicator="line" formatter={(v) => formatIDR(v as number)} />} 
                />
                <Bar 
                  dataKey={chartMode} 
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                >
                  {(() => {
                    const maxValue = Math.max(...chartData.map((d: any) => d[chartMode]), 0)
                    return chartData.map((entry: any, index: number) => {
                      const val = entry[chartMode]
                      let color = '#f59e0b' // Low (Amber/Yellow)
                      if (val > 0 && val >= maxValue * 0.7) color = '#8b5cf6' // High (Violet/Purple)
                      else if (val > 0 && val >= maxValue * 0.3) color = '#10b981' // Mid (Emerald/Green)
                      return <Cell key={`cell-${index}`} fill={color} />                    })
                  })()}
                </Bar>              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed rounded-xl border-slate-50 italic">
              <p className="text-xs font-bold uppercase tracking-widest">No transaction data</p>
            </div>
          )}
        </CardContent>      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="py-4 px-6 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold">Payment Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {data?.paymentMethods && Object.entries(data.paymentMethods).map(([method, count]) => {
                const total = Object.values(data.paymentMethods).reduce((a, b) => a + b, 0)
                const percentage = (count / total) * 100
                return (
                  <div key={method} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{getPaymentMethodLabel(method)}</span>
                      <span>{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full">
                      <div className="h-full bg-slate-900 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
              {(!data?.paymentMethods || Object.keys(data.paymentMethods).length === 0) && (
                <p className="text-center py-10 text-xs text-slate-400 font-medium italic">No payment data for this period</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="py-4 px-6 border-b bg-slate-50/50 flex flex-row items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableBody>
                {data?.orders && data.orders.length > 0 ? (
                  data.orders.slice(0, 5).map((order) => (
                    <TableRow key={order.id} className="text-xs border-slate-100">
                      <TableCell className="py-3 pl-6 font-medium text-slate-400">
                        {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="font-bold text-slate-700">{order.member?.name || 'Walk-in'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-black uppercase h-5 px-1.5 border-slate-200 text-slate-400">{getPaymentMethodLabel(order.payment_method)}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 font-black text-slate-900">{formatIDR(order.total)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell className="h-32 text-center text-xs text-slate-300 italic">No recent activity</TableCell></TableRow>
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
    <Card className={`border-slate-200 shadow-sm rounded-xl ${dark ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900'}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
            <p className="text-2xl font-black tracking-tight">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <Icon size={18} className="text-slate-400" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1.5">
            <div className={`flex items-center text-[10px] font-black px-2 py-0.5 rounded-md ${
              trend.direction === 'up' ? (dark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
              trend.direction === 'down' ? (dark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600') : 'bg-slate-100 text-slate-400'
            }`}>
              <TrendIcon size={10} className="mr-1 stroke-[3px]" /> {trend.label}
            </div>
            <span className={`text-[10px] font-bold ${dark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-tighter`}>vs prev</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
