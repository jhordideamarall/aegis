import { NextResponse } from 'next/server'
import { getOrderPaymentColumnSupport } from '@/lib/orderPaymentColumns'
import { supabaseAdmin } from '@/lib/supabase'
import { toTimeZoneHourKey, toTimeZoneISODate } from '@/lib/utils'
import {
  forbiddenResponse,
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'

interface DashboardOrder {
  id: string
  total: number
  discount: number
  tax_amount: number
  service_amount: number
  payment_method: string
  payment_provider?: string | null
  created_at: string
  member_id: string | null
  order_items?: Array<{
    product_id: string
    qty: number
    price: number
    cost_price: number
    product?: { name?: string; price?: number } | null
  }>
  member?: { name: string; phone: string } | Array<{ name: string; phone: string }> | null
}

export async function GET(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const businessId = searchParams.get('business_id')

    if (businessId && businessId !== businessContext.businessId) {
      return forbiddenResponse('Cannot access another business')
    }

    const resolvedBusinessId = businessContext.businessId

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Parse dates - treat input as UTC dates and query full day range
    const parseDateRange = (dateString: string, includeTime: 'start' | 'end' = 'start'): Date => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(dateString)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD')
      }

      const [year, month, day] = dateString.split('-').map(Number)
      
      // Create date in UTC and adjust for WIB (UTC+7)
      // Start of day WIB is 17:00 UTC of previous day
      // End of day WIB is 16:59:59 UTC of same day
      if (includeTime === 'start') {
        const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
        d.setHours(d.getHours() - 7)
        return d
      } else {
        const d = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
        d.setHours(d.getHours() - 7)
        return d
      }
    }

    let rangeStart = parseDateRange(startDate, 'start')
    let rangeEnd = parseDateRange(endDate, 'end')
    
    console.log('[DEBUG API Dashboard] startDate:', startDate, '-> rangeStart:', rangeStart.toISOString())
    console.log('[DEBUG API Dashboard] endDate:', endDate, '-> rangeEnd:', rangeEnd.toISOString())

    if (rangeEnd < rangeStart) {
      const temp = rangeStart
      rangeStart = rangeEnd
      rangeEnd = temp
    }

    const dayMs = 24 * 60 * 60 * 1000
    const diffDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / dayMs)
    const days = diffDays + 1

    const prevEnd = new Date(rangeStart.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - dayMs * (days - 1))

    const currentStartDate = rangeStart.toISOString()
    const currentEndDate = rangeEnd.toISOString()
    const prevStartDate = prevStart.toISOString()
    const prevEndDate = prevEnd.toISOString()

    const paymentColumnSupport = await getOrderPaymentColumnSupport()
    const dashboardOrdersSelect = [
      'id',
      'total',
      'discount',
      'tax_amount',
      'service_amount',
      'payment_method',
      paymentColumnSupport.provider ? 'payment_provider' : null,
      'created_at',
      'member_id',
      'order_items(product_id, qty, price, cost_price, product:products(name, price))',
      'member:members(name, phone)'
    ]
      .filter(Boolean)
      .join(',\n        ')

    // Queries
    const [
      { data: orders, error: ordersError },
      { data: prevOrders, error: prevOrdersError },
      { count: totalProducts },
      { count: totalMembers },
      { count: newMembers, error: newMembersError },
      { count: prevNewMembers, error: prevNewMembersError }
    ] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select(dashboardOrdersSelect)
        .eq('business_id', resolvedBusinessId)
        .gte('created_at', currentStartDate)
        .lte('created_at', currentEndDate)
        .limit(100000)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('orders')
        .select('total, order_items(qty, price, cost_price)')
        .eq('business_id', resolvedBusinessId)
        .gte('created_at', prevStartDate)
        .lte('created_at', prevEndDate)
        .limit(100000),
      supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', resolvedBusinessId),
      supabaseAdmin
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', resolvedBusinessId),
      supabaseAdmin
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', resolvedBusinessId)
        .gte('created_at', currentStartDate)
        .lte('created_at', currentEndDate),
      supabaseAdmin
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', resolvedBusinessId)
        .gte('created_at', prevStartDate)
        .lte('created_at', prevEndDate)
    ])

    if (ordersError) throw ordersError

    const normalizedOrders = ((orders || []) as unknown) as DashboardOrder[]
    const normalizedPrevOrders = ((prevOrders || []) as unknown) as DashboardOrder[]

    // Use comprehensive RPC to get all metrics
    const { data: metrics } = await supabaseAdmin.rpc('get_dashboard_metrics', {
      p_business_id: resolvedBusinessId,
      p_start_date: currentStartDate,
      p_end_date: currentEndDate
    })
    
    const { data: prevMetrics } = await supabaseAdmin.rpc('get_dashboard_metrics', {
      p_business_id: resolvedBusinessId,
      p_start_date: prevStartDate,
      p_end_date: prevEndDate
    })

    const current = metrics?.[0] || {}
    const prev = prevMetrics?.[0] || {}

    // Calculations:
    // - Net Revenue = total - tax - service
    // - Net Profit = net revenue - cost
    const totalSales = Number(current.total_revenue) || 0
    const totalOrders = Number(current.total_orders) || 0
    const totalTax = Number(current.total_tax) || 0
    const totalService = Number(current.total_service) || 0
    const totalCost = Number(current.total_cost) || 0
    
    const totalNetRevenue = totalSales - totalTax - totalService
    const totalNetProfit = totalNetRevenue - totalCost
    
    const prevTotalSales = Number(prev.total_revenue) || 0
    const prevTotalOrders = Number(prev.total_orders) || 0
    const prevTotalTax = Number(prev.total_tax) || 0
    const prevTotalService = Number(prev.total_service) || 0
    const prevTotalCost = Number(prev.total_cost) || 0
    
    const prevTotalNetRevenue = prevTotalSales - prevTotalTax - prevTotalService
    const prevTotalNetProfit = prevTotalNetRevenue - prevTotalCost

    const totalItems = normalizedOrders.reduce((sum, order) => sum + (order.order_items?.length || 0), 0)

    // Top Lists
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
    normalizedOrders.forEach(order => {
      order.order_items?.forEach((item) => {
        const productId = item.product_id
        if (!productSales[productId]) {
          productSales[productId] = { name: item.product?.name || 'Unknown', qty: 0, revenue: 0 }
        }
        productSales[productId].qty += item.qty
        productSales[productId].revenue += item.price * item.qty
      })
    })

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const memberSpending: Record<string, { name: string; phone: string; total: number; orders: number }> = {}
    normalizedOrders.forEach(order => {
      const member = Array.isArray(order.member) ? order.member[0] : order.member
      if (order.member_id && member) {
        if (!memberSpending[order.member_id]) {
          memberSpending[order.member_id] = { name: member.name, phone: member.phone, total: 0, orders: 0 }
        }
        memberSpending[order.member_id].total += order.total
        memberSpending[order.member_id].orders += 1
      }
    })

    const topMembers = Object.entries(memberSpending)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Chart Data
    const isSingleDay = startDate === endDate
    const salesByDate: Record<string, number> = {}
    const profitByDate: Record<string, number> = {}

    normalizedOrders.forEach(order => {
      const key = isSingleDay ? toTimeZoneHourKey(order.created_at) : toTimeZoneISODate(order.created_at)
      salesByDate[key] = (salesByDate[key] || 0) + order.total
      const orderProfit = order.order_items?.reduce((oSum, item) => oSum + ((item.price - item.cost_price) * item.qty), 0) || 0
      profitByDate[key] = (profitByDate[key] || 0) + orderProfit
    })

    const salesChart = Object.entries(salesByDate)
      .map(([date, sales]) => ({ date, sales, profit: profitByDate[date] || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const paymentMethods: Record<string, number> = {}
    normalizedOrders.forEach(order => {
      paymentMethods[order.payment_method] = (paymentMethods[order.payment_method] || 0) + 1
    })

    return NextResponse.json({
      totalSales,
      totalNetRevenue,
      totalOrders,
      totalItems,
      totalNetProfit,
      prevTotalSales,
      prevTotalNetRevenue,
      prevTotalOrders,
      prevTotalNetProfit,
      newMembers: newMembers || 0,
      prevNewMembers: prevNewMembers || 0,
      totalProducts: totalProducts || 0,
      totalMembers: totalMembers || 0,
      topProducts,
      topMembers,
      salesChart,
      paymentMethods,
      orders: normalizedOrders
    })
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
