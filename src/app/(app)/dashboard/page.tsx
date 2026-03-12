'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
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
  DollarSign
} from 'react-feather'

interface DashboardData {
  totalSales: number
  totalOrders: number
  totalItems: number
  prevTotalSales: number
  prevTotalOrders: number
  newMembers: number
  prevNewMembers: number
  totalProducts: number
  totalMembers: number
  topProducts: Array<{ id: string; name: string; qty: number; revenue: number }>
  topMembers: Array<{ id: string; name: string; phone: string; total: number; orders: number }>
  salesChart: Array<{ date: string; sales: number }>
  paymentMethods: Record<string, number>
  orders: any[]
}

export default function DashboardPage() {
  const { business, loading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const isLoading = loading || fetching

  const fetchDashboard = useCallback(async () => {
    if (!business) {
      setFetching(false)
      return
    }
    let startDate: string
    let endDate: string

    if (dateRange === 'custom') {
      startDate = customStartDate || toLocalISODate()
      endDate = customEndDate || toLocalISODate()
      if (endDate < startDate) {
        const temp = startDate
        startDate = endDate
        endDate = temp
      }
    } else {
      const now = new Date()

      if (dateRange === 'today') {
        // Today: full day today (use local date string)
        startDate = toLocalISODate(now)
        endDate = toLocalISODate(now)
      } else if (dateRange === 'week') {
        // This Week: Sunday to Saturday of current week (calendar week)
        const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay)
        weekStart.setHours(0, 0, 0, 0)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // Saturday
        weekEnd.setHours(23, 59, 59, 999)

        startDate = toLocalISODate(weekStart)
        endDate = toLocalISODate(weekEnd)
      } else { // month
        // This Month: 1st to last day of current month (calendar month)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of month
        monthEnd.setHours(23, 59, 59, 999)

        startDate = toLocalISODate(monthStart)
        endDate = toLocalISODate(monthEnd)
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
      const res = await fetch(url)
      if (res.ok) {
        const result = await res.json()
        setData(result)
        setClientCache(cacheKey, result)
      } else {
        console.error('Dashboard fetch failed:', res.status)
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setFetching(false)
    }
  }, [business, dateRange, customStartDate, customEndDate])

  useEffect(() => {
    if (!loading && business) {
      if (dateRange !== 'custom') {
        fetchDashboard()
      }
    }
  }, [loading, business, dateRange, fetchDashboard])

  useEffect(() => {
    if (!business) return

    const channel = supabase
      .channel(`dashboard-${business.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${business.id}` },
        () => fetchDashboard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `business_id=eq.${business.id}` },
        () => fetchDashboard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `business_id=eq.${business.id}` },
        () => fetchDashboard()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [business, fetchDashboard])

  const buildTrend = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { label: '0%', direction: 'neutral' as const }
      return { label: '+100%', direction: 'up' as const }
    }

    const change = ((current - previous) / previous) * 100
    const rounded = Math.round(change)
    if (rounded === 0) return { label: '0%', direction: 'neutral' as const }
    return {
      label: `${rounded > 0 ? '+' : ''}${rounded}%`,
      direction: rounded > 0 ? ('up' as const) : ('down' as const)
    }
  }

  const salesTrend = data ? buildTrend(data.totalSales, data.prevTotalSales) : null
  const ordersTrend = data ? buildTrend(data.totalOrders, data.prevTotalOrders) : null
  const membersTrend = data ? buildTrend(data.newMembers, data.prevNewMembers) : null

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm md:text-base text-gray-500">{business?.business_name}</p>
        </div>
        <div className="flex flex-col md:flex-row md:items-end gap-2">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setDateRange('today')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  dateRange === 'today' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRange('week')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  dateRange === 'week' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateRange('month')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  dateRange === 'month' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateRange('custom')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  dateRange === 'custom' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Custom
              </button>
            </div>
            {dateRange === 'custom' && (
              <div className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">From:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">To:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <button
                  onClick={fetchDashboard}
                  className="px-3 py-1 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
                >
                  Apply
                </button>
              </div>
            )}
        </div>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <StatCard
            title="Total Sales"
            value={formatIDR(data?.totalSales || 0)}
            icon={TrendingUp}
            trend={salesTrend || undefined}
          />
          <StatCard
            title="Orders"
            value={data?.totalOrders || 0}
            icon={ShoppingBag}
            trend={ordersTrend || undefined}
          />
          <StatCard
            title="Products"
            value={data?.totalProducts || 0}
            icon={Package}
          />
          <StatCard
            title="Members"
            value={data?.totalMembers || 0}
            icon={Users}
            trend={membersTrend || undefined}
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart - Line Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Sales Trend</h2>
            {isLoading && (!data || data.salesChart.length === 0) ? (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Loading sales data...
              </div>
            ) : data?.salesChart && data.salesChart.length > 0 ? (
              <div className="h-64 relative">
                <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 50, 100, 150, 200].map((y, i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={y}
                      x2="400"
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Calculate points for line */}
                  {(() => {
                    const maxSales = Math.max(...data.salesChart.map(s => s.sales))
                    const minSales = Math.min(...data.salesChart.map(s => s.sales))
                    const range = maxSales - minSales || 1
                    
                    // Handle single data point
                    if (data.salesChart.length === 1) {
                      const x = 200
                      const y = 100
                      return (
                        <>
                          <polyline
                            points={`${x},${y} ${x},${y}`}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill="#3b82f6"
                            stroke="#fff"
                            strokeWidth="2"
                          >
                            <title>{`${data.salesChart[0].date}: Rp ${data.salesChart[0].sales.toLocaleString('id-ID')}`}</title>
                          </circle>
                        </>
                      )
                    }
                    
                    const points = data.salesChart.map((item, index) => {
                      const x = (index / (data.salesChart.length - 1)) * 400
                      const y = 200 - ((item.sales - minSales) / range) * 180 - 10
                      return `${x},${y}`
                    }).join(' ')
                    
                    const areaPoints = `0,200 ${points} 400,200`
                    
                    return (
                      <>
                        {/* Area under line */}
                        <polygon
                          points={areaPoints}
                          fill="url(#gradient)"
                          opacity="0.3"
                        />
                        
                        {/* Line */}
                        <polyline
                          points={points}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Data points */}
                        {data.salesChart.map((item, index) => {
                          const x = (index / (data.salesChart.length - 1)) * 400
                          const y = 200 - ((item.sales - minSales) / range) * 180 - 10
                          return (
                            <circle
                              key={index}
                              cx={x}
                              cy={y}
                              r="5"
                              fill="#3b82f6"
                              stroke="#fff"
                              strokeWidth="2"
                              className="hover:r-8 transition-all cursor-pointer"
                            >
                              <title>{`${item.date}: Rp ${item.sales.toLocaleString('id-ID')}`}</title>
                            </circle>
                          )
                        })}
                        
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </>
                    )
                  })()}
                </svg>

                {/* X-axis labels */}
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  {data.salesChart.map((item, index) => {
                    // Check if it's hourly data (contains 'T' and ':00')
                    const isHourly = item.date.includes('T') && item.date.endsWith(':00')
                    let label = ''
                    if (isHourly) {
                      // Extract hour from format like "2026-03-12T14:00"
                      const hourMatch = item.date.match(/T(\d{2}):00/)
                      if (hourMatch) {
                        const hour = parseInt(hourMatch[1])
                        label = `${hour}:00`
                      }
                    }
                    if (!label) {
                      label = new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                    }
                    return (
                      <span key={index} className="text-center">
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No sales data yet
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Methods</h2>
            {isLoading && (!data || Object.keys(data.paymentMethods || {}).length === 0) ? (
              <div className="h-48 flex items-center justify-center text-gray-400">
                Loading payment data...
              </div>
            ) : data?.paymentMethods && Object.keys(data.paymentMethods).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(data.paymentMethods).map(([method, count]) => {
                  const total = Object.values(data.paymentMethods).reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">{method}</span>
                        <span className="text-sm text-gray-500">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">
                No payment data yet
              </div>
            )}
          </div>
        </div>

        {/* Top Products & Members */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Top Products */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award size={20} strokeWidth={2} className="text-gray-700" />
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Top Products</h2>
            </div>
            {isLoading && (!data || data.topProducts.length === 0) ? (
              <div className="text-center py-8 text-gray-400">
                Loading products...
              </div>
            ) : data?.topProducts && data.topProducts.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {data.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 md:gap-4">
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-semibold text-xs md:text-sm ${
                      index === 0 ? 'bg-yellow-50 text-yellow-700' :
                      index === 1 ? 'bg-gray-50 text-gray-700' :
                      index === 2 ? 'bg-orange-50 text-orange-700' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs md:text-sm text-gray-500">{product.qty} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs md:text-sm font-semibold text-gray-900">{formatIDR(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No products sold yet
              </div>
            )}
          </div>

          {/* Top Members */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} strokeWidth={2} className="text-gray-700" />
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Top Members</h2>
            </div>
            {isLoading && (!data || data.topMembers.length === 0) ? (
              <div className="text-center py-8 text-gray-400">
                Loading members...
              </div>
            ) : data?.topMembers && data.topMembers.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {data.topMembers.map((member, index) => (
                  <div key={member.id} className="flex items-center gap-3 md:gap-4">
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-semibold text-xs md:text-sm ${
                      index === 0 ? 'bg-yellow-50 text-yellow-700' :
                      index === 1 ? 'bg-gray-50 text-gray-700' :
                      index === 2 ? 'bg-orange-50 text-orange-700' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs md:text-sm text-gray-500 truncate">{member.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs md:text-sm font-semibold text-gray-900">{formatIDR(member.total)}</p>
                      <p className="text-xs text-gray-400">{member.orders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No members yet
              </div>
            )}
          </div>
        </div>
        {/* Recent Sales (Today) */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <Clock size={20} strokeWidth={2} className="text-gray-700" />
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Recent Sales (Today)</h2>
            </div>
          </div>
          {isLoading && (!data || data.orders.length === 0) ? (
            <div className="text-center py-12 text-gray-400">Loading sales...</div>
          ) : data?.orders && data.orders.length > 0 ? (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="px-4 md:px-0">
                <table className="w-full min-w-[600px] md:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-500">Time</th>
                      <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-500">Order ID</th>
                      <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-500">Customer</th>
                      <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-500">Items</th>
                      <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-500">Payment</th>
                      <th className="text-right py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders
                      .filter((order) => isSameLocalDate(new Date(order.created_at), new Date()))
                      .slice(0, 10)
                      .map((order) => {
                      const orderDate = new Date(order.created_at)
                      return (
                        <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm text-gray-900 whitespace-nowrap">
                            {orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                            <span className="font-mono text-gray-600">#{order.id.slice(0, 8).toUpperCase()}</span>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm text-gray-900">
                            {order.member?.name || 'General Customer'}
                          </td>
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm text-gray-500">
                            {order.order_items?.length || 0} items
                          </td>
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium capitalize">
                              {order.payment_method}
                            </span>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-xs md:text-sm text-right">
                            <span className="font-semibold text-gray-900">{formatIDR(order.total)}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <DollarSign size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-20" />
              <p>No sales today</p>
              <p className="text-sm mt-1">Start selling from POS</p>
            </div>
          )}
        </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend
}: {
  title: string
  value: string | number
  icon: any
  trend?: { label: string; direction: 'up' | 'down' | 'neutral' }
}) {
  const TrendIcon = trend?.direction === 'down' ? ArrowDownRight : trend?.direction === 'neutral' ? ArrowRight : ArrowUpRight
  const trendClasses =
    trend?.direction === 'down'
      ? 'text-red-600 bg-red-50'
      : trend?.direction === 'neutral'
        ? 'text-gray-600 bg-gray-100'
        : 'text-green-600 bg-green-50'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
          <Icon size={22} strokeWidth={2} className="text-gray-700" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${trendClasses}`}>
            <TrendIcon size={14} />
            {trend.label}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
