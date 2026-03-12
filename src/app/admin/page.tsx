'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  BarChart,
  Mail,
  Phone,
  Edit,
  X,
  Menu,
  ChevronDown,
  Calendar,
  Award
} from 'react-feather'

interface Business {
  id: string
  business_name: string
  email: string
  phone: string
  industry: string
  status: string
  created_at: string
  subdomain: string
  slug: string
  city: string
}

interface BusinessStats {
  totalOrders: number
  totalRevenue: number
  totalMembers: number
  totalProducts: number
  todayOrders: number
  todayRevenue: number
  avgOrderValue: number
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<(Business & BusinessStats)[]>([])
  const [totalBusinesses, setTotalBusinesses] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [activeBusinesses, setActiveBusinesses] = useState(0)
  const [topPerformers, setTopPerformers] = useState<(Business & BusinessStats)[]>([])
  const [error, setError] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [statusValue, setStatusValue] = useState('active')
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'top' | 'all'>('overview')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'revenue' | 'orders' | 'members' | 'name'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [statsMap, setStatsMap] = useState<Record<string, BusinessStats>>({})

  useEffect(() => {
    checkAdmin()
  }, [router])

  useEffect(() => {
    // Re-fetch stats when time filter changes
    if (!loading && businesses.length > 0) {
      fetchStatsForTimeRange()
    }
  }, [timeFilter, startDate, endDate])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email?.includes('admin@')) {
      router.push('/')
      return
    }
    fetchDashboard()
  }

  const fetchDashboard = async () => {
    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setError('Session expired. Please login again.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/businesses', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch businesses')
      }

      const data = await res.json()
      const businessesList = data || []

      setBusinesses(businessesList)
      setTotalBusinesses(businessesList.length)
      setActiveBusinesses(businessesList.filter((b: any) => b.status === 'active').length)

      // Fetch stats for all businesses (all time)
      await fetchStatsForTimeRange(businessesList)

      setLoading(false)
    } catch (error: any) {
      console.error('Error fetching dashboard:', error)
      setError(error.message || 'Failed to fetch dashboard')
      setLoading(false)
    }
  }

  const fetchStatsForTimeRange = async (businessesList?: Business[]) => {
    const list = businessesList || businesses
    if (list.length === 0) return

    try {
      // Calculate date range based on filter - CALENDAR BASED
      let startDateParam = ''
      let endDateParam = ''
      
      const now = new Date()
      
      if (timeFilter === 'today') {
        // Today: Full day today (local date)
        startDateParam = now.toISOString().split('T')[0]
        endDateParam = startDateParam
      } else if (timeFilter === 'week') {
        // This Week: Sunday to Saturday of current week
        const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay)
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // Saturday
        weekEnd.setHours(23, 59, 59, 999)
        
        startDateParam = weekStart.toISOString().split('T')[0]
        endDateParam = weekEnd.toISOString().split('T')[0]
      } else if (timeFilter === 'month') {
        // This Month: 1st to last day of current month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of month
        monthEnd.setHours(23, 59, 59, 999)
        
        startDateParam = monthStart.toISOString().split('T')[0]
        endDateParam = monthEnd.toISOString().split('T')[0]
      } else if (timeFilter === 'year') {
        // This Year: Jan 1 to Dec 31 of current year
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const yearEnd = new Date(now.getFullYear(), 11, 31)
        yearEnd.setHours(23, 59, 59, 999)
        
        startDateParam = yearStart.toISOString().split('T')[0]
        endDateParam = yearEnd.toISOString().split('T')[0]
      } else if (timeFilter === 'custom' && startDate && endDate) {
        // Custom Range: User selected dates
        startDateParam = startDate
        endDateParam = endDate
      }
      // 'all' time filter - don't pass dates

      // Fetch stats for each business with time range
      const statsPromises = list.map(async (biz: Business) => {
        const stats = await fetchBusinessStats(biz.id, startDateParam, endDateParam)
        return { id: biz.id, stats }
      })

      const statsResults = await Promise.all(statsPromises)
      const newStatsMap: Record<string, BusinessStats> = {}
      statsResults.forEach(({ id, stats }) => {
        newStatsMap[id] = stats
      })
      setStatsMap(newStatsMap)
      
      // Calculate totals from stats - ALWAYS update totals
      let rev = 0
      let ord = 0
      Object.values(newStatsMap).forEach(stats => {
        rev += stats.totalRevenue
        ord += stats.totalOrders
      })
      
      // Update totals based on current filter
      setTotalRevenue(rev)
      setTotalOrders(ord)
    } catch (error) {
      console.error('Error fetching stats for time range:', error)
    }
  }

  const openEdit = (biz: any) => {
    setEditing(biz)
    setStatusValue(biz.status || 'active')
  }

  const saveStatus = async () => {
    if (!editing || !accessToken) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/businesses/${editing.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: statusValue })
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update business')
      }
      
      fetchDashboard()
      setEditing(null)
    } catch (error: any) {
      setError(error.message || 'Failed to update business')
    } finally {
      setSaving(false)
    }
  }

  const handleEmail = (email?: string) => {
    if (!email) return
    window.open(`mailto:${email}`, '_blank')
  }

  const handleWhatsapp = (phone?: string) => {
    if (!phone) return
    let waNumber = phone.replace(/\D/g, '')
    if (waNumber.startsWith('0')) {
      waNumber = '62' + waNumber.slice(1)
    } else if (waNumber.startsWith('8')) {
      waNumber = '62' + waNumber
    }
    if (!waNumber) return
    window.open(`https://wa.me/${waNumber}`, '_blank')
  }

  const fetchBusinessStats = async (businessId: string, startDate?: string, endDate?: string): Promise<BusinessStats> => {
    try {
      let url = `/api/admin/businesses/${businessId}/stats`
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      const res = await fetch(url)
      if (!res.ok) return defaultStats()
      const data = await res.json()
      return data
    } catch {
      return defaultStats()
    }
  }

  const defaultStats = () => ({
    totalOrders: 0,
    totalRevenue: 0,
    totalMembers: 0,
    totalProducts: 0,
    todayOrders: 0,
    todayRevenue: 0,
    avgOrderValue: 0
  })

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num)
  }

  const getFilteredBusinesses = () => {
    let filtered = [...businesses]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(biz => 
        biz.business_name.toLowerCase().includes(query) ||
        biz.email.toLowerCase().includes(query) ||
        (biz.phone && biz.phone.toLowerCase().includes(query)) ||
        (biz.industry && biz.industry.toLowerCase().includes(query)) ||
        (biz.city && biz.city.toLowerCase().includes(query))
      )
    }
    
    // Merge with stats
    const filteredWithStats = filtered.map(biz => ({
      ...biz,
      ...statsMap[biz.id]
    }))
    
    // Apply sort
    filteredWithStats.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'revenue') {
        comparison = a.totalRevenue - b.totalRevenue
      } else if (sortBy === 'orders') {
        comparison = a.totalOrders - b.totalOrders
      } else if (sortBy === 'members') {
        comparison = a.totalMembers - b.totalMembers
      } else if (sortBy === 'name') {
        comparison = a.business_name.localeCompare(b.business_name)
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })
    
    return filteredWithStats
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  const filteredBusinesses = getFilteredBusinesses()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">AEGIS POS</h1>
              <p className="text-xs text-gray-500">Super Admin</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-72 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out z-50
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">AEGIS POS</h1>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              <button
                onClick={() => { setActiveTab('overview'); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'overview'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BarChart size={18} strokeWidth={2} />
                <span className="text-sm font-medium">Overview</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('top'); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'top'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Award size={18} strokeWidth={2} />
                <span className="text-sm font-medium">Top Performers</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('all'); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users size={18} strokeWidth={2} />
                <span className="text-sm font-medium">All Businesses</span>
                <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {totalBusinesses}
                </span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
                Quick Stats
              </h3>
              <div className="space-y-2">
                <div className="mx-4 px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Total Businesses</span>
                    <Users size={14} className="text-gray-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{totalBusinesses}</p>
                  <p className="text-xs text-gray-500">{activeBusinesses} active</p>
                </div>
                
                <div className="mx-4 px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Total Revenue</span>
                    <DollarSign size={14} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatIDR(totalRevenue)}</p>
                  <p className="text-xs text-gray-500">All time</p>
                </div>
                
                <div className="mx-4 px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Total Orders</span>
                    <ShoppingBag size={14} className="text-gray-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatNumber(totalOrders)}</p>
                  <p className="text-xs text-gray-500">All transactions</p>
                </div>
              </div>
            </div>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors text-sm font-medium"
              >
                <span>Logout</span>
              </button>
              <Link
                href="/"
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Back to Site →
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        {/* Desktop Top Bar */}
        <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {activeTab === 'overview' && 'Overview'}
                  {activeTab === 'top' && 'Top Performing Businesses'}
                  {activeTab === 'all' && 'All Businesses'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {activeTab === 'overview' && 'Monitor all businesses performance and activities'}
                  {activeTab === 'top' && 'Ranked by revenue performance'}
                  {activeTab === 'all' && 'Detailed overview of all registered businesses'}
                </p>
              </div>
              
              {/* Time Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                    className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                    <option value="all">All Time</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                
                {timeFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <StatCard
                  title="Total Businesses"
                  value={totalBusinesses.toString()}
                  subtitle={`${activeBusinesses} active, ${totalBusinesses - activeBusinesses} suspended`}
                  icon={<Users size={24} strokeWidth={2} />}
                />
                <StatCard
                  title={`Total Revenue (${timeFilter === 'all' ? 'All Time' : timeFilter})`}
                  value={formatIDR(totalRevenue)}
                  subtitle={timeFilter === 'all' ? 'Across all businesses' : `For selected period`}
                  icon={<DollarSign size={24} strokeWidth={2} />}
                />
                <StatCard
                  title={`Total Orders (${timeFilter === 'all' ? 'All Time' : timeFilter})`}
                  value={formatNumber(totalOrders)}
                  subtitle={timeFilter === 'all' ? 'All transactions' : `For selected period`}
                  icon={<ShoppingBag size={24} strokeWidth={2} />}
                />
                <StatCard
                  title="Avg. Revenue/Business"
                  value={formatIDR(totalBusinesses > 0 ? totalRevenue / totalBusinesses : 0)}
                  subtitle="Average per business"
                  icon={<BarChart size={24} strokeWidth={2} />}
                />
              </div>

              {/* Top Performers */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Award size={20} strokeWidth={2} className="text-yellow-500" />
                      Top Performing Businesses
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Based on total revenue (all time)</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {businesses
                    .map(biz => ({ ...biz, ...statsMap[biz.id] }))
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .slice(0, 5)
                    .map((biz, index) => (
                      <div
                        key={biz.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-gray-900">{biz.business_name}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              biz.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {biz.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{biz.industry} • {biz.city || 'Unknown'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{formatIDR(biz.totalRevenue)}</p>
                          <p className="text-xs text-gray-500">{biz.totalOrders} orders • {biz.totalMembers} members</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {/* Top Performers Tab */}
          {activeTab === 'top' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">All Businesses Ranking</h3>
                    <p className="text-sm text-gray-600 mt-1">Sorted by performance metrics</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="revenue">Revenue</option>
                      <option value="orders">Orders</option>
                      <option value="members">Members</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Industry</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Revenue</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Orders</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Members</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBusinesses.map((biz, index) => (
                      <tr key={biz.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{biz.business_name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{biz.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900 capitalize">{biz.industry}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            biz.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {biz.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold text-blue-600 text-sm">{formatIDR(biz.totalRevenue)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-gray-900 text-sm">{formatNumber(biz.totalOrders)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-gray-900 text-sm">{formatNumber(biz.totalMembers)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Businesses Tab */}
          {activeTab === 'all' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">All Businesses</h3>
                    <p className="text-sm text-gray-600 mt-1">Detailed overview with all metrics</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Search Bar */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search businesses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
                      />
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="revenue">Revenue</option>
                      <option value="orders">Orders</option>
                      <option value="members">Members</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Industry</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Revenue</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Orders</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Members</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Joined</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBusinesses.map((biz) => (
                      <tr key={biz.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{biz.business_name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{biz.email}</p>
                            {biz.phone && <p className="text-xs text-gray-500">{biz.phone}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900 capitalize">{biz.industry}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            biz.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {biz.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold text-blue-600 text-sm">{formatIDR(biz.totalRevenue)}</p>
                          <p className="text-xs text-gray-500">{formatIDR(biz.todayRevenue)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-gray-900 text-sm">{formatNumber(biz.totalOrders)}</p>
                          <p className="text-xs text-gray-500">{biz.todayOrders}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-gray-900 text-sm">{formatNumber(biz.totalMembers)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-600 whitespace-nowrap">
                            {new Date(biz.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEmail(biz.email)}
                              className="text-blue-600 hover:text-blue-700 p-1.5"
                              title="Send Email"
                            >
                              <Mail size={16} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => handleWhatsapp(biz.phone)}
                              className="text-green-600 hover:text-green-700 p-1.5"
                              title="Send WhatsApp"
                            >
                              <Phone size={16} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => openEdit(biz)}
                              className="text-orange-600 hover:text-orange-700 p-1.5"
                              title="Edit Status"
                            >
                              <Edit size={16} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Status Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Business Status</h3>
              <button
                onClick={() => setEditing(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Business:</p>
              <p className="font-semibold text-gray-900">{editing.business_name}</p>
              <p className="text-sm text-gray-600 mt-2">Email:</p>
              <p className="text-gray-900">{editing.email}</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Suspended businesses cannot access the POS system
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveStatus}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle, icon }: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  )
}
