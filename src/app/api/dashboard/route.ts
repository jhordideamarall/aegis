import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Helper to format date as local YYYY-MM-DD
function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Parse dates - treat input as local dates (YYYY-MM-DD format from frontend)
    // Convert to Indonesian time (WIB - UTC+7)
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

    // Create dates in WIB timezone (UTC+7)
    // Start of day for startDate in WIB
    let rangeStart = new Date(Date.UTC(startYear, (startMonth || 1) - 1, startDay || 1, 0, 0, 0, 0))
    rangeStart = new Date(rangeStart.getTime() - (7 * 3600000)) // Convert to UTC (subtract 7 hours)
    
    // End of day for endDate in WIB
    let rangeEnd = new Date(Date.UTC(endYear, (endMonth || 1) - 1, endDay || 1, 23, 59, 59, 999))
    rangeEnd = new Date(rangeEnd.getTime() - (7 * 3600000)) // Convert to UTC (subtract 7 hours)

    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      )
    }

    if (rangeEnd < rangeStart) {
      const temp = rangeStart
      rangeStart = rangeEnd
      rangeEnd = temp
    }

    const dayMs = 24 * 60 * 60 * 1000
    const diffDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / dayMs)
    const days = diffDays + 1

    const prevEnd = new Date(rangeStart.getTime() - 1) // One millisecond before start
    const prevStart = new Date(prevEnd.getTime() - dayMs * (days - 1))

    // Format for Supabase query (ISO string with timezone)
    const currentStartDate = rangeStart.toISOString()
    const currentEndDate = rangeEnd.toISOString()
    const prevStartDate = prevStart.toISOString()
    const prevEndDate = prevEnd.toISOString()

    // Get orders with date filter
    const ordersQuery = supabaseAdmin
      .from('orders')
      .select(`
        id,
        total,
        payment_method,
        created_at,
        member_id,
        order_items(product_id, qty, price, product:products(name, price)),
        member:members(name, phone)
      `)
      .eq('business_id', businessId)
      .gte('created_at', currentStartDate)
      .lte('created_at', currentEndDate)
      .order('created_at', { ascending: false })

    const prevOrdersQuery = supabaseAdmin
      .from('orders')
      .select('total')
      .eq('business_id', businessId)
      .gte('created_at', prevStartDate)
      .lte('created_at', prevEndDate)

    const totalProductsQuery = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    const totalMembersQuery = supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    const newMembersQuery = supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', currentStartDate)
      .lte('created_at', currentEndDate)

    const prevNewMembersQuery = supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', prevStartDate)
      .lte('created_at', prevEndDate)

    const [
      { data: orders, error: ordersError },
      { data: prevOrders, error: prevOrdersError },
      { count: totalProducts },
      { count: totalMembers },
      { count: newMembers, error: newMembersError },
      { count: prevNewMembers, error: prevNewMembersError }
    ] = await Promise.all([
      ordersQuery,
      prevOrdersQuery,
      totalProductsQuery,
      totalMembersQuery,
      newMembersQuery,
      prevNewMembersQuery
    ])

    if (ordersError) {
      console.error('Orders error:', ordersError)
      throw ordersError
    }

    if (orders && orders.length > 0) {
    } else {
      // No orders found for date filter
    }

    // Calculate stats
    const totalSales = orders?.reduce((sum, order) => sum + order.total, 0) || 0
    const totalOrders = orders?.length || 0
    const totalItems = orders?.reduce((sum, order) => sum + (order.order_items?.length || 0), 0) || 0

    if (prevOrdersError) {
      console.error('Prev orders error:', prevOrdersError)
      throw prevOrdersError
    }

    const prevTotalSales = prevOrders?.reduce((sum, order) => sum + order.total, 0) || 0
    const prevTotalOrders = prevOrders?.length || 0

    if (newMembersError) {
      console.error('New members error:', newMembersError)
      throw newMembersError
    }

    if (prevNewMembersError) {
      console.error('Prev new members error:', prevNewMembersError)
      throw prevNewMembersError
    }

    // Top selling products - aggregate by product
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
    orders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const productId = item.product_id
        const productName = item.product?.name || 'Unknown Product'
        const itemPrice = item.price || item.product?.price || 0

        if (!productSales[productId]) {
          productSales[productId] = {
            name: productName,
            qty: 0,
            revenue: 0
          }
        }
        productSales[productId].qty += item.qty
        productSales[productId].revenue += itemPrice * item.qty
      })
    })

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Top members by spending
    const memberSpending: Record<string, { name: string; phone: string; total: number; orders: number }> = {}
    orders?.forEach(order => {
      const member = Array.isArray(order.member) ? order.member[0] : order.member
      if (order.member_id && member) {
        if (!memberSpending[order.member_id]) {
          memberSpending[order.member_id] = {
            name: member.name,
            phone: member.phone,
            total: 0,
            orders: 0
          }
        }
        memberSpending[order.member_id].total += order.total
        memberSpending[order.member_id].orders += 1
      }
    })

    const topMembers = Object.entries(memberSpending)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Sales by date for chart
    // Check if it's a single day (today filter) - compare date parts only
    const startDateOnly = startDate // Use original date string from frontend
    const endDateOnly = endDate
    const isSingleDay = startDateOnly === endDateOnly

    const salesByDate: Record<string, number> = {}
    orders?.forEach(order => {
      if (isSingleDay) {
        // Group by hour for single day (convert UTC to WIB - UTC+7)
        const orderDate = new Date(order.created_at)
        // Get UTC time, then add 7 hours for WIB
        const utcTime = orderDate.getTime()
        const wibTime = new Date(utcTime + (7 * 3600000)) // WIB is UTC+7
        const hour = wibTime.getHours()
        const hourKey = `${startDateOnly}T${String(hour).padStart(2, '0')}:00`
        salesByDate[hourKey] = (salesByDate[hourKey] || 0) + order.total
      } else {
        // Group by date for multiple days (convert to WIB date)
        const orderDate = new Date(order.created_at)
        // Convert UTC to WIB for consistent date
        const utcTime = orderDate.getTime()
        const wibTime = new Date(utcTime + (7 * 3600000))
        const date = wibTime.toISOString().split('T')[0]
        salesByDate[date] = (salesByDate[date] || 0) + order.total
      }
    })

    const salesChart = Object.entries(salesByDate)
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Orders by payment method
    const paymentMethods: Record<string, number> = {}
    orders?.forEach(order => {
      paymentMethods[order.payment_method] = (paymentMethods[order.payment_method] || 0) + 1
    })

    return NextResponse.json({
      totalSales,
      totalOrders,
      totalItems,
      prevTotalSales,
      prevTotalOrders,
      newMembers: newMembers || 0,
      prevNewMembers: prevNewMembers || 0,
      totalProducts: totalProducts || 0,
      totalMembers: totalMembers || 0,
      topProducts,
      topMembers,
      salesChart,
      paymentMethods,
      orders: orders || []
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
