import { supabaseAdmin } from './supabase'

export interface Stats {
  count: number
  revenue: number
  profit: number
  net_revenue: number
}

export interface CachedStats {
  today: Stats
  yesterday: Stats
  week: Stats
  month: Stats
  year: Stats
  lastUpdated: number
}

const statsCache = new Map<string, CachedStats>()
const CACHE_TTL = 60_000 // 1 minute TTL

async function calcStats(businessId: string, from: Date): Promise<Stats> {
  const { data: orderData } = await supabaseAdmin
    .from('orders')
    .select('id, total, tax_amount, service_amount')
    .eq('business_id', businessId)
    .gte('created_at', from.toISOString())

  if (!orderData?.length) return { count: 0, revenue: 0, profit: 0, net_revenue: 0 }

  const revenue = orderData.reduce((s, o) => s + Number(o.total), 0)
  const tax = orderData.reduce((s, o) => s + Number(o.tax_amount || 0), 0)
  const service = orderData.reduce((s, o) => s + Number(o.service_amount || 0), 0)

  const cost = revenue * 0.7
  const profit = revenue - tax - service - cost

  return {
    count: orderData.length,
    revenue,
    profit,
    net_revenue: revenue - tax - service
  }
}

export async function getCachedStats(businessId: string): Promise<CachedStats> {
  const cached = statsCache.get(businessId)
  if (cached && Date.now() - cached.lastUpdated < CACHE_TTL) {
    return cached
  }

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(now); yesterdayStart.setDate(now.getDate() - 1); yesterdayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const [today, yesterday, week, month, year] = await Promise.all([
    calcStats(businessId, todayStart),
    calcStats(businessId, yesterdayStart),
    calcStats(businessId, weekStart),
    calcStats(businessId, monthStart),
    calcStats(businessId, yearStart),
  ])

  const result: CachedStats = {
    today,
    yesterday,
    week,
    month,
    year,
    lastUpdated: Date.now()
  }

  statsCache.set(businessId, result)
  return result
}

export function formatStats(stats: Stats): string {
  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`
  return `${stats.count} order | ${fmt(stats.revenue)} revenue | ${fmt(stats.net_revenue)} net`
}

export function formatStatsCompact(stats: Stats): string {
  const fmt = (n: number) => `Rp${(n / 1000000).toFixed(1)}jt`
  return `${stats.count}ord | ${fmt(stats.revenue)}`
}