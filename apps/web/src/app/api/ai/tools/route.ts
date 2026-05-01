import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { getCachedStats, formatStats, Stats } from '@/lib/ai-stats-cache'

export const maxDuration = 30

interface ToolParams {
  date?: string
  startDate?: string
  endDate?: string
  limit?: number
  category?: string
  search?: string
  lowStock?: boolean
  period?: string
}

function parseDate(dateStr: string): { start: Date; end: Date } | null {
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)

  switch (dateStr) {
    case 'today':
      return { start: today, end: now }
    case 'yesterday':
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1); yesterday.setHours(0, 0, 0, 0)
      const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23, 59, 59, 999)
      return { start: yesterday, end: yesterdayEnd }
    case 'last-7-days':
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
      return { start: weekAgo, end: now }
    default:
      // Try YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr + 'T00:00:00.000Z')
        const end = new Date(dateStr + 'T23:59:59.999Z')
        if (!isNaN(date.getTime())) {
          return { start: date, end }
        }
      }
  }
  return null
}

async function queryOrders(businessId: string, params: ToolParams) {
  let query = supabaseAdmin
    .from('orders')
    .select('id, total, tax_amount, service_amount, created_at, payment_method, member:members(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (params.date) {
    const range = parseDate(params.date)
    if (range) {
      query = query.gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString())
    }
  } else if (params.startDate && params.endDate) {
    query = query.gte('created_at', params.startDate).lte('created_at', params.endDate + 'T23:59:59.999')
  }

  const limit = params.limit || 50
  const { data: orders, error } = await query.limit(limit)

  if (error) throw new Error(error.message)

  const totalRevenue = (orders || []).reduce((s, o) => s + Number(o.total), 0)
  const count = orders?.length || 0

  return {
    count,
    revenue: totalRevenue,
    orders: orders?.slice(0, 10).map(o => {
      const memberName = (o.member as unknown as { name: string } | null)
      return {
        id: o.id,
        total: Number(o.total),
        created_at: o.created_at,
        payment_method: o.payment_method,
        member: memberName?.name || 'Umum'
      }
    }) || []
  }
}

async function queryProducts(businessId: string, params: ToolParams) {
  let query = supabaseAdmin
    .from('products')
    .select('id, name, price, stock, category')
    .eq('business_id', businessId)
    .order('name')

  if (params.category) {
    query = query.ilike('category', `%${params.category}%`)
  }

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`)
  }

  if (params.lowStock) {
    query = query.lte('stock', 5)
  }

  const { data: products, error } = await query.limit(100)

  if (error) throw new Error(error.message)

  const lowStockCount = (products || []).filter(p => p.stock <= 5).length

  return {
    total: products?.length || 0,
    lowStockCount,
    products: products?.slice(0, 20).map(p => ({
      name: p.name,
      price: Number(p.price),
      stock: p.stock,
      category: p.category
    })) || []
  }
}

async function queryMembers(businessId: string, params: ToolParams) {
  let query = supabaseAdmin
    .from('members')
    .select('id, name, phone, points, total_purchases')
    .eq('business_id', businessId)
    .order('total_purchases', { ascending: false })

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%`)
  }

  const { data: members, error } = await query.limit(50)

  if (error) throw new Error(error.message)

  return {
    total: members?.length || 0,
    members: members?.slice(0, 20).map(m => ({
      name: m.name,
      phone: m.phone,
      points: m.points,
      total_purchases: Number(m.total_purchases)
    })) || []
  }
}

async function queryStats(businessId: string, params: ToolParams) {
  const period = params.period || 'today'
  const cached = await getCachedStats(businessId)

  const statsMap: Record<string, Stats> = {
    today: cached.today,
    yesterday: cached.yesterday,
    week: cached.week,
    month: cached.month,
    year: cached.year
  }

  const stats = statsMap[period] || cached.today
  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`

  return {
    period,
    count: stats.count,
    revenue: stats.revenue,
    net_revenue: stats.net_revenue,
    profit: stats.profit,
    formatted: `${stats.count} order | ${fmt(stats.revenue)} revenue | ${fmt(stats.net_revenue)} net`,
    compare: period !== 'today' ? {
      today: `${cached.today.count} order | ${fmt(cached.today.revenue)}`
    } : null
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getBusinessContextFromRequest(request)
    if (!ctx) return unauthorizedResponse()

    const { businessId } = ctx
    const body = await request.json() as { tool: string; params: ToolParams }

    const { tool, params } = body

    if (!tool) {
      return NextResponse.json({ error: 'tool is required' }, { status: 400 })
    }

    let result: unknown

    switch (tool) {
      case 'query_orders':
        result = await queryOrders(businessId, params)
        break
      case 'query_products':
        result = await queryProducts(businessId, params)
        break
      case 'query_members':
        result = await queryMembers(businessId, params)
        break
      case 'query_stats':
        result = await queryStats(businessId, params)
        break
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tool = url.searchParams.get('tool')

  if (!tool) {
    return NextResponse.json({
      tools: {
        query_orders: {
          description: "Ambil data transaksi/pesanan",
          params: {
            date: "today | yesterday | YYYY-MM-DD | last-7-days",
            startDate: "YYYY-MM-DD (optional)",
            endDate: "YYYY-MM-DD (optional)",
            limit: "default 50"
          }
        },
        query_products: {
          description: "Ambil data produk",
          params: {
            category: "kategori (optional)",
            search: "nama produk (optional)",
            lowStock: "true/false (optional)"
          }
        },
        query_members: {
          description: "Ambil data member",
          params: {
            search: "nama atau phone (optional)"
          }
        },
        query_stats: {
          description: "Ambil statistik agregat",
          params: {
            period: "today | yesterday | week | month | year"
          }
        }
      }
    })
  }

  return NextResponse.json({})
}