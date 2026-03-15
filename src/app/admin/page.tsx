'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  buildFeatureUpdateWhatsAppMessage,
  buildWhatsAppUrl,
  getFeatureUpdateUrl,
  normalizeWhatsAppNumber
} from '@/lib/featureUpdates'
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  BarChart,
  Bell,
  Mail,
  Phone,
  Edit,
  Eye,
  X,
  Menu,
  ChevronDown,
  Calendar,
  Award
} from 'react-feather'

interface BusinessSettings {
  receipt_header?: string
  receipt_footer?: string
  paper_size?: string
  currency?: string
  timezone?: string
  [key: string]: unknown
}

interface Business {
  id: string
  business_name: string
  email: string | null
  phone: string | null
  pic_name: string | null
  industry: string | null
  status: string
  created_at: string
  updated_at: string
  subdomain: string
  slug: string
  city: string | null
  address: string | null
  logo_url: string | null
  settings: BusinessSettings | null
}

interface FeatureUpdateItem {
  id: string
  slug: string
  title: string
  version: string | null
  summary: string
  content: string
  highlights: string[]
  status: 'draft' | 'published'
  featured: boolean
  published_at: string | null
  email_sent_at: string | null
  email_recipient_count: number
  email_last_error: string | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

interface WhatsAppRecipient {
  id: string
  businessName: string
  picName: string | null
  phone: string
  waNumber: string
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
  const [detailBusiness, setDetailBusiness] = useState<(Business & Partial<BusinessStats>) | null>(null)
  const [statusValue, setStatusValue] = useState('active')
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'top' | 'all' | 'updates'>('overview')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'revenue' | 'orders' | 'members' | 'name'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [statsMap, setStatsMap] = useState<Record<string, BusinessStats>>({})
  const [featureUpdates, setFeatureUpdates] = useState<FeatureUpdateItem[]>([])
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [updatesError, setUpdatesError] = useState('')
  const [announcementNotice, setAnnouncementNotice] = useState('')
  const [publishingUpdate, setPublishingUpdate] = useState(false)
  const [announcementForm, setAnnouncementForm] = useState({
    version: '',
    title: '',
    summary: '',
    content: '',
    highlights: '',
    publishNow: true,
    featured: false
  })
  const [whatsAppPreview, setWhatsAppPreview] = useState<{
    update: FeatureUpdateItem
    recipients: WhatsAppRecipient[]
    sampleMessage: string
  } | null>(null)

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
    if (!user) {
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

      setAccessToken(accessToken)

      const res = await fetch('/api/admin/businesses', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (res.status === 401 || res.status === 403) {
        router.push('/')
        return
      }

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
      await fetchFeatureUpdates(accessToken)

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

      // Capture current accessToken value to avoid race condition
      const currentToken = accessToken

      // Fetch stats for each business with time range
      const statsPromises = list.map(async (biz: Business) => {
        const stats = await fetchBusinessStats(biz.id, startDateParam, endDateParam, currentToken)
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

  const openDetail = (biz: Business & Partial<BusinessStats>) => {
    setDetailBusiness(biz)
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

  const handleEmail = (email?: string | null) => {
    if (!email) return
    window.open(`mailto:${email}`, '_blank')
  }

  const handleWhatsapp = (phone?: string | null) => {
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

  const fetchFeatureUpdates = async (tokenArg?: string) => {
    const token = tokenArg || accessToken
    if (!token) return

    try {
      setUpdatesLoading(true)
      setUpdatesError('')

      const res = await fetch('/api/admin/feature-updates', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to fetch feature updates')
      }

      const data = await res.json()
      setFeatureUpdates(data.updates || [])
    } catch (error: any) {
      setUpdatesError(error.message || 'Failed to fetch feature updates')
    } finally {
      setUpdatesLoading(false)
    }
  }

  const handleCreateFeatureUpdate = async () => {
    if (!accessToken) return

    try {
      setPublishingUpdate(true)
      setUpdatesError('')
      setAnnouncementNotice('')

      const res = await fetch('/api/admin/feature-updates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(announcementForm)
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create feature update')
      }

      setAnnouncementForm({
        version: '',
        title: '',
        summary: '',
        content: '',
        highlights: '',
        publishNow: true,
        featured: false
      })

      setAnnouncementNotice('Feature update berhasil dibuat.')
      await fetchFeatureUpdates(accessToken)
    } catch (error: any) {
      setUpdatesError(error.message || 'Failed to create feature update')
    } finally {
      setPublishingUpdate(false)
    }
  }

  const getWhatsAppRecipients = () => {
    return businesses
      .filter((biz) => ['active', 'demo'].includes(biz.status))
      .map((biz) => ({
        id: biz.id,
        businessName: biz.business_name,
        picName: biz.pic_name,
        phone: biz.phone || '',
        waNumber: normalizeWhatsAppNumber(biz.phone)
      }))
      .filter((biz) => Boolean(biz.waNumber))
  }

  const handleOpenWhatsAppBroadcast = (update: FeatureUpdateItem) => {
    setUpdatesError('')
    setAnnouncementNotice('')

    if (update.status !== 'published') {
      setUpdatesError('Publish update ini dulu supaya link detail update bisa dibuka dari WhatsApp.')
      return
    }

    const recipients = getWhatsAppRecipients()
    if (recipients.length === 0) {
      setUpdatesError('Belum ada bisnis aktif/demo yang memiliki nomor WhatsApp.')
      return
    }

    const sampleMessage = buildFeatureUpdateWhatsAppMessage({
      businessName: recipients[0].businessName,
      picName: recipients[0].picName,
      updateTitle: update.title,
      version: update.version,
      summary: update.summary,
      highlights: update.highlights,
      updateUrl: getFeatureUpdateUrl(update.slug)
    })

    setWhatsAppPreview({
      update,
      recipients,
      sampleMessage
    })
  }

  const handleCopyWhatsAppTemplate = async () => {
    if (!whatsAppPreview) return

    try {
      await navigator.clipboard.writeText(whatsAppPreview.sampleMessage)
      setAnnouncementNotice('Template WhatsApp berhasil disalin.')
    } catch {
      setUpdatesError('Gagal menyalin template WhatsApp.')
    }
  }

  const fetchBusinessStats = async (businessId: string, startDate?: string, endDate?: string, token?: string): Promise<BusinessStats> => {
    try {
      let url = `/api/admin/businesses/${businessId}/stats`
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      if (params.toString()) {
        url += `?${params.toString()}`
      }
      const authHeaders = token
        ? { Authorization: `Bearer ${token}` }
        : undefined
      const res = await fetch(url, {
        headers: authHeaders
      })
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

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatText = (value?: string | null) => {
    if (!value || !value.trim()) return '-'
    return value
  }

  const whatsappRecipientsCount = getWhatsAppRecipients().length

  const getFilteredBusinesses = () => {
    let filtered = [...businesses]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(biz => 
        biz.business_name.toLowerCase().includes(query) ||
        (biz.pic_name && biz.pic_name.toLowerCase().includes(query)) ||
        (biz.email && biz.email.toLowerCase().includes(query)) ||
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

              <button
                onClick={() => { setActiveTab('updates'); setSidebarOpen(false); void fetchFeatureUpdates() }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'updates'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Bell size={18} strokeWidth={2} />
                <span className="text-sm font-medium">Feature Updates</span>
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
                  {activeTab === 'updates' && 'Feature Updates'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {activeTab === 'overview' && 'Monitor all businesses performance and activities'}
                  {activeTab === 'top' && 'Ranked by revenue performance'}
                  {activeTab === 'all' && 'Detailed overview of all registered businesses'}
                  {activeTab === 'updates' && 'Publish release announcements and prepare feature update WhatsApp broadcasts'}
                </p>
              </div>
              
              {/* Time Filter */}
              {activeTab !== 'updates' && (
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
              )}
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
                            {biz.pic_name && <p className="text-xs text-gray-500">PIC: {biz.pic_name}</p>}
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
                            {biz.pic_name && <p className="text-xs text-gray-500">PIC: {biz.pic_name}</p>}
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
                              onClick={() => openDetail(biz)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              title="View Details"
                            >
                              <Eye size={16} strokeWidth={2} />
                              <span>Detail</span>
                            </button>
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

          {activeTab === 'updates' && (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Buat Pengumuman Update</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Update ini akan tampil di halaman publik `Update Fitur` dan bisa disebarkan lewat WhatsApp.
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      whatsappRecipientsCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {whatsappRecipientsCount > 0 ? `${whatsappRecipientsCount} Nomor WA Siap` : 'Belum Ada Nomor WA'}
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Version</label>
                        <input
                          type="text"
                          value={announcementForm.version}
                          onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, version: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., v1.3.0"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Title</label>
                        <input
                          type="text"
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Judul pembaruan fitur"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Summary</label>
                      <textarea
                        value={announcementForm.summary}
                        onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, summary: e.target.value }))}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ringkasan singkat yang muncul di halaman update dan WhatsApp."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Detailed Content</label>
                      <textarea
                        value={announcementForm.content}
                        onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))}
                        rows={7}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tulis penjelasan lengkap. Pisahkan paragraf dengan satu baris kosong."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Highlights</label>
                      <textarea
                        value={announcementForm.highlights}
                        onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, highlights: e.target.value }))}
                        rows={5}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={'Satu highlight per baris\nContoh: QRIS sekarang mendukung provider general dan bank'}
                      />
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={announcementForm.publishNow}
                          onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, publishNow: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>Publish langsung ke halaman Update Fitur</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={announcementForm.featured}
                          onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, featured: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>Tandai sebagai featured release</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleCreateFeatureUpdate}
                        disabled={publishingUpdate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {publishingUpdate ? 'Menyimpan...' : 'Simpan Pengumuman'}
                      </button>
                      <Link
                        href="/updates"
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Lihat Halaman Publik
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-lg font-bold text-gray-900">Panduan Publish</h3>
                  <div className="mt-5 space-y-4 text-sm leading-7 text-gray-600">
                    <p>
                      Gunakan halaman ini untuk mengumumkan perubahan penting pada sistem seperti fitur baru,
                      penyempurnaan alur transaksi, pembaruan laporan, atau perubahan operasional yang perlu diketahui user.
                    </p>
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
                      <p className="font-semibold">Flow yang direkomendasikan</p>
                      <ol className="mt-2 list-decimal space-y-2 pl-5">
                        <li>Tulis judul, summary, detail lengkap, dan highlights.</li>
                        <li>Centang `Publish langsung` jika update sudah siap tampil ke publik.</li>
                        <li>Setelah tersimpan, buka broadcast WhatsApp dari daftar update di bawah.</li>
                      </ol>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="font-semibold text-gray-900">Catatan WhatsApp</p>
                      <p className="mt-2">
                        Flow ini tidak butuh SMTP. Sistem akan menyiapkan template pesan berdasarkan update fitur, lalu admin
                        bisa membuka chat WhatsApp ke bisnis yang punya nomor terdaftar.
                      </p>
                    </div>
                    {announcementNotice && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                        {announcementNotice}
                      </div>
                    )}
                    {updatesError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                        {updatesError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Riwayat Feature Updates</h3>
                    <p className="mt-1 text-sm text-gray-600">Kelola post yang sudah dipublikasikan atau siap dibroadcast lewat WhatsApp.</p>
                  </div>
                  <button
                    onClick={() => void fetchFeatureUpdates()}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                </div>

                <div className="p-6">
                  {updatesLoading ? (
                    <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
                      Loading feature updates...
                    </div>
                  ) : featureUpdates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
                      Belum ada pengumuman update fitur.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {featureUpdates.map((update) => (
                        <div key={update.id} className="rounded-2xl border border-gray-200 p-5">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="max-w-3xl">
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                                <span className={`rounded-full px-3 py-1 ${
                                  update.status === 'published'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {update.status}
                                </span>
                                {update.featured && (
                                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">featured</span>
                                )}
                                {update.version && (
                                  <span className="rounded-full border border-gray-200 px-3 py-1 text-gray-600">{update.version}</span>
                                )}
                              </div>
                              <h4 className="mt-3 text-xl font-semibold text-gray-900">{update.title}</h4>
                              <p className="mt-2 text-sm leading-7 text-gray-600">{update.summary}</p>
                              {update.highlights.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {update.highlights.slice(0, 4).map((item) => (
                                    <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-4 text-xs text-gray-500">
                                Published: {formatDateTime(update.published_at)} • Nomor WA siap: {whatsappRecipientsCount}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/updates/${update.slug}`}
                                target="_blank"
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                              >
                                Open Page
                              </Link>
                              <button
                                onClick={() => handleOpenWhatsAppBroadcast(update)}
                                disabled={whatsappRecipientsCount === 0}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Broadcast WA
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                <option value="demo">Demo</option>
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

      {detailBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Business Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Informasi lengkap untuk {detailBusiness.business_name}
                </p>
              </div>
              <button
                onClick={() => setDetailBusiness(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close business details"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-73px)] space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <DetailMetricCard
                  title="Total Revenue"
                  value={formatIDR(detailBusiness.totalRevenue || 0)}
                  subtitle={`${formatNumber(detailBusiness.totalOrders || 0)} orders`}
                />
                <DetailMetricCard
                  title="Members"
                  value={formatNumber(detailBusiness.totalMembers || 0)}
                  subtitle={`${formatNumber(detailBusiness.totalProducts || 0)} products`}
                />
                <DetailMetricCard
                  title="Avg Order Value"
                  value={formatIDR(detailBusiness.avgOrderValue || 0)}
                  subtitle={`${formatIDR(detailBusiness.todayRevenue || 0)} revenue today`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DetailSection title="Business Profile">
                  <DetailRow label="Business ID" value={detailBusiness.id} />
                  <DetailRow label="Business Name" value={detailBusiness.business_name} />
                  <DetailRow label="Industry" value={formatText(detailBusiness.industry)} />
                  <DetailRow label="Status" value={detailBusiness.status} />
                  <DetailRow label="Subdomain" value={detailBusiness.subdomain} />
                  <DetailRow label="Slug" value={detailBusiness.slug} />
                  <DetailRow label="Created At" value={formatDateTime(detailBusiness.created_at)} />
                  <DetailRow label="Updated At" value={formatDateTime(detailBusiness.updated_at)} />
                </DetailSection>

                <DetailSection title="Contact & Location">
                  <DetailRow label="PIC Brand/Toko" value={formatText(detailBusiness.pic_name)} />
                  <DetailRow label="Email" value={formatText(detailBusiness.email)} />
                  <DetailRow label="Phone" value={formatText(detailBusiness.phone)} />
                  <DetailRow label="City" value={formatText(detailBusiness.city)} />
                  <DetailRow label="Address" value={formatText(detailBusiness.address)} multiline />
                  <DetailRow label="Logo URL" value={formatText(detailBusiness.logo_url)} multiline />
                </DetailSection>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DetailSection title="Performance Snapshot">
                  <DetailRow label="Total Orders" value={formatNumber(detailBusiness.totalOrders || 0)} />
                  <DetailRow label="Today Orders" value={formatNumber(detailBusiness.todayOrders || 0)} />
                  <DetailRow label="Total Revenue" value={formatIDR(detailBusiness.totalRevenue || 0)} />
                  <DetailRow label="Today Revenue" value={formatIDR(detailBusiness.todayRevenue || 0)} />
                  <DetailRow label="Total Members" value={formatNumber(detailBusiness.totalMembers || 0)} />
                  <DetailRow label="Total Products" value={formatNumber(detailBusiness.totalProducts || 0)} />
                </DetailSection>

                <DetailSection title="Business Settings">
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all">
                      {JSON.stringify(detailBusiness.settings || {}, null, 2)}
                    </pre>
                  </div>
                </DetailSection>
              </div>
            </div>
          </div>
        </div>
      )}

      {whatsAppPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Broadcast WhatsApp</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {whatsAppPreview.update.title} • {whatsAppPreview.recipients.length} bisnis siap dihubungi
                </p>
              </div>
              <button
                onClick={() => setWhatsAppPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-gray-200 p-6 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Template Pesan</h4>
                    <p className="mt-1 text-xs text-gray-500">Pesan sudah disusun otomatis dari data update fitur.</p>
                  </div>
                  <button
                    onClick={() => void handleCopyWhatsAppTemplate()}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Copy Template
                  </button>
                </div>
                <pre className="mt-4 max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                  {whatsAppPreview.sampleMessage}
                </pre>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-900">Daftar Penerima</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Klik tombol chat untuk membuka WhatsApp dengan pesan yang sudah dipersonalisasi.
                </p>
                <div className="mt-4 max-h-[55vh] space-y-3 overflow-auto">
                  {whatsAppPreview.recipients.map((recipient) => {
                    const message = buildFeatureUpdateWhatsAppMessage({
                      businessName: recipient.businessName,
                      picName: recipient.picName,
                      updateTitle: whatsAppPreview.update.title,
                      version: whatsAppPreview.update.version,
                      summary: whatsAppPreview.update.summary,
                      highlights: whatsAppPreview.update.highlights,
                      updateUrl: getFeatureUpdateUrl(whatsAppPreview.update.slug)
                    })

                    return (
                      <div key={recipient.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{recipient.businessName}</p>
                          <p className="text-sm text-gray-500">
                            {recipient.picName ? `PIC: ${recipient.picName} • ` : ''}
                            {recipient.phone}
                          </p>
                        </div>
                        <a
                          href={buildWhatsAppUrl(recipient.waNumber, message)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                          <Phone size={16} strokeWidth={2} />
                          Chat WhatsApp
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
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

function DetailSection({ title, children }: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">{title}</h4>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value, multiline = false }: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className={`flex ${multiline ? 'flex-col gap-1' : 'items-start justify-between gap-4'}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      <span className={`text-sm text-gray-900 ${multiline ? 'break-words' : 'text-right break-all'}`}>
        {value}
      </span>
    </div>
  )
}

function DetailMetricCard({ title, value, subtitle }: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  )
}
