import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'
import { getOrderPaymentColumnSupport } from '@/lib/orderPaymentColumns'
import { isValidPaymentMethod, isValidPaymentProvider } from '@/lib/payments'
import {
  forbiddenResponse,
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'
import { toDate, formatInTimeZone } from 'date-fns-tz'
import { escapeILikePattern } from '@/lib/utils'

interface OrdersListRow {
  id: string
  member_id: string | null
  total: number
  payment_method: string
  payment_provider?: string | null
  payment_proof_url?: string | null
  payment_proof_uploaded_at?: string | null
  payment_notes?: string | null
  created_at: string
  order_items?: Array<{ id: string }>
  member?: { name: string; phone: string } | Array<{ name: string; phone: string }> | null
}

// Helper to format date as local YYYY-MM-DD in UTC timezone
function toLocalISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Helper to parse YYYY-MM-DD to UTC Date
function parseLocalDateToUTC(dateString: string, includeTime: 'start' | 'end' = 'start'): Date | null {
  // Validate format first
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return null
  }

  const [year, month, day] = dateString.split('-').map(Number)

  // Validate ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  // Create date in UTC
  if (includeTime === 'start') {
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  } else {
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  }
}

export async function GET(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')
    const businessId = searchParams.get('business_id')
    let startDate = searchParams.get('startDate')
    let endDate = searchParams.get('endDate')
    const paymentMethod = searchParams.get('payment_method')
    const search = (searchParams.get('q') || '').trim()
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.max(parseInt(searchParams.get('limit') || '20', 10), 1)
    const from = (page - 1) * limit
    const to = from + limit - 1

    if (businessId && businessId !== businessContext.businessId) {
      return forbiddenResponse('Cannot access another business')
    }

    const resolvedBusinessId = businessContext.businessId

    if (orderId) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items(*, product:products(*)),
          member:members(name, phone)
        `)
        .eq('id', orderId)
        .eq('business_id', resolvedBusinessId)
        .single()

      if (orderError) throw orderError
      return NextResponse.json(order)
    }

    const paymentColumnSupport = await getOrderPaymentColumnSupport()
    const listSelect = [
      'id',
      'member_id',
      'total',
      'payment_method',
      paymentColumnSupport.provider ? 'payment_provider' : null,
      paymentColumnSupport.proof ? 'payment_proof_url' : null,
      paymentColumnSupport.proof ? 'payment_proof_uploaded_at' : null,
      paymentColumnSupport.notes ? 'payment_notes' : null,
      'created_at',
      'order_items(id)',
      'member:members(name, phone)'
    ]
      .filter(Boolean)
      .join(',\n        ')

    // Parse dates - treat input as local dates (YYYY-MM-DD format from frontend)
    // Convert to Indonesian time (WIB - UTC+7)
    let rangeStart: Date | null = null
    let rangeEnd: Date | null = null

    if (startDate && endDate) {
      rangeStart = parseLocalDateToUTC(startDate, 'start')
      rangeEnd = parseLocalDateToUTC(endDate, 'end')

      if (!rangeStart || !rangeEnd || Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }

      if (rangeEnd < rangeStart) {
        const temp = rangeStart
        rangeStart = rangeEnd
        rangeEnd = temp
      }
    } else if (startDate) {
      // Only startDate provided - treat as single day in WIB
      rangeStart = parseLocalDateToUTC(startDate, 'start')
      rangeEnd = parseLocalDateToUTC(startDate, 'end')
      
      if (!rangeStart || !rangeEnd) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }
    }

    let query = supabaseAdmin
      .from('orders')
      .select(listSelect, { count: 'exact' })
      .eq('business_id', resolvedBusinessId)

    if (rangeStart) {
      query = query.gte('created_at', rangeStart.toISOString())
    }

    if (rangeEnd) {
      query = query.lte('created_at', rangeEnd.toISOString())
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod)
    }

    if (search) {
      // Performance optimization: Don't search if query too short
      if (search.length < 2) {
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          limit,
          summary: {
            totalRevenue: 0,
            totalOrders: 0
          }
        })
      }

      // First, find matching members if any
      let memberIds: string[] = []
      const escapedSearch = escapeILikePattern(search)
      const { data: matchingMembers } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('business_id', resolvedBusinessId)
        .or(`name.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%`)
        .limit(100) // Limit member search to prevent abuse

      if (matchingMembers && matchingMembers.length > 0) {
        memberIds = matchingMembers.map(m => m.id)
      }

      // Fetch all orders in the date range (without pagination first)
      // SAFETY LIMIT: Max 2000 rows to prevent memory issues
      const MAX_SEARCH_ROWS = 2000
      
      let allOrdersQuery = supabaseAdmin
        .from('orders')
        .select(listSelect)
        .eq('business_id', resolvedBusinessId)
        .limit(MAX_SEARCH_ROWS)

      if (rangeStart) {
        allOrdersQuery = allOrdersQuery.gte('created_at', rangeStart.toISOString())
      }

      if (rangeEnd) {
        allOrdersQuery = allOrdersQuery.lte('created_at', rangeEnd.toISOString())
      }

      if (paymentMethod && paymentMethod !== 'all') {
        allOrdersQuery = allOrdersQuery.eq('payment_method', paymentMethod)
      }

      allOrdersQuery = allOrdersQuery.order('created_at', { ascending: false })

      const { data: allOrders, error: fetchError } = await allOrdersQuery

      if (fetchError) throw fetchError
      const normalizedAllOrders = ((allOrders || []) as unknown) as OrdersListRow[]

      // Filter orders in memory with consistent logic
      const filterOrder = (order: OrdersListRow): boolean => {
        // Match by order ID
        if (order.id.toLowerCase().includes(search.toLowerCase())) return true
        // Match by payment method
        if (order.payment_method.toLowerCase().includes(search.toLowerCase())) return true
        // Match by payment provider
        if (paymentColumnSupport.provider && order.payment_provider?.toLowerCase().includes(search.toLowerCase())) return true
        // Match by member ID
        if (memberIds.length > 0 && order.member_id && memberIds.includes(order.member_id)) return true
        return false
      }

      let filteredOrders = normalizedAllOrders.filter(filterOrder)

      // Also fetch matching member orders that might be outside the current page range
      if (memberIds.length > 0) {
        const { data: extraMemberOrders } = await supabaseAdmin
          .from('orders')
          .select(listSelect)
          .eq('business_id', resolvedBusinessId)
          .in('member_id', memberIds)
          .order('created_at', { ascending: false })
          .limit(500) // Reasonable limit to prevent memory issues

        const normalizedExtraMemberOrders = ((extraMemberOrders || []) as unknown) as OrdersListRow[]

        if (normalizedExtraMemberOrders.length > 0) {
          const existingIds = new Set(filteredOrders.map(o => o.id))
          normalizedExtraMemberOrders.forEach(o => {
            if (!existingIds.has(o.id)) {
              filteredOrders.push(o)
            }
          })
          // Re-sort by created_at descending
          filteredOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }
      }

      // Apply pagination manually
      const total = filteredOrders.length
      const paginatedData = filteredOrders.slice(from, from + limit)

      // Calculate summary using the same filtered results
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)

      // Return early with filtered results
      return NextResponse.json({
        data: paginatedData,
        total: total,
        page,
        limit,
        summary: {
          totalRevenue,
          totalOrders: total
        }
      })
    }

    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    // Calculate summary for non-search queries
    let summaryQuery = supabaseAdmin
      .from('orders')
      .select('total', { count: 'exact' })
      .eq('business_id', resolvedBusinessId)

    if (rangeStart) {
      summaryQuery = summaryQuery.gte('created_at', rangeStart.toISOString())
    }

    if (rangeEnd) {
      summaryQuery = summaryQuery.lte('created_at', rangeEnd.toISOString())
    }

    if (paymentMethod && paymentMethod !== 'all') {
      summaryQuery = summaryQuery.eq('payment_method', paymentMethod)
    }

    const { data: summaryData, count: summaryCount, error: summaryError } = await summaryQuery
    if (summaryError) throw summaryError

    const totalRevenue = summaryData?.reduce((sum, order) => sum + order.total, 0) || 0

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
      summary: {
        totalRevenue,
        totalOrders: summaryCount || 0
      }
    })
  } catch (error) {
    // Log internally for debugging (use structured logging service in production)
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const {
      total,
      payment_method,
      payment_provider,
      payment_notes,
      member_id,
      points_earned = 0,
      points_used = 0,
      discount = 0,
      items,
      business_id
    } = body

    // Validation
    if (business_id && business_id !== businessContext.businessId) {
      return forbiddenResponse('Cannot create order for another business')
    }

    const resolvedBusinessId = businessContext.businessId

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order items are required' },
        { status: 400 }
      )
    }

    if (!payment_method || typeof payment_method !== 'string' || !isValidPaymentMethod(payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment_method' },
        { status: 400 }
      )
    }

    if (payment_provider && (typeof payment_provider !== 'string' || !isValidPaymentProvider(payment_provider))) {
      return NextResponse.json(
        { error: 'Invalid payment_provider' },
        { status: 400 }
      )
    }

    const paymentColumnSupport = await getOrderPaymentColumnSupport()

    const statusCheck = await assertBusinessActive(resolvedBusinessId)
    if (!statusCheck.ok) {
      return NextResponse.json(
        { error: statusCheck.message },
        { status: statusCheck.status }
      )
    }

    const orderPayload: Record<string, unknown> = {
      total,
      payment_method,
      member_id: member_id || null,
      points_earned,
      points_used,
      discount,
      business_id: resolvedBusinessId
    }

    if (paymentColumnSupport.provider && payment_method === 'qris' && payment_provider) {
      orderPayload.payment_provider = payment_provider
    }

    if (paymentColumnSupport.notes && typeof payment_notes === 'string' && payment_notes.trim()) {
      orderPayload.payment_notes = payment_notes.trim()
    }

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([orderPayload])
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items with product validation and atomic stock update
    const orderItems = []
    for (const item of items) {
      // Verify product exists and belongs to this business
      const { data: product, error: productFetchError } = await supabaseAdmin
        .from('products')
        .select('id, stock, business_id, name')
        .eq('id', item.product_id)
        .eq('business_id', resolvedBusinessId)
        .single()

      if (productFetchError || !product) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found in your business` },
          { status: 404 }
        )
      }

      // Check stock availability
      if (product.stock < item.qty) {
        return NextResponse.json(
          { error: `Insufficient stock for product ${product.name}` },
          { status: 400 }
        )
      }

      orderItems.push({
        order_id: order.id,
        product_id: item.product_id,
        qty: item.qty,
        price: item.price,
        business_id: resolvedBusinessId
      })

      // Atomic stock update with optimistic locking
      // Re-check stock to get latest value, then update with exact match
      const { data: latestProduct, error: recheckError } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .eq('business_id', resolvedBusinessId)
        .single()

      if (recheckError || !latestProduct) {
        await supabaseAdmin.from('orders').delete().eq('id', order.id)
        return NextResponse.json(
          { error: `Product ${product.name} is no longer available` },
          { status: 409 }
        )
      }

      if (latestProduct.stock < item.qty) {
        // Stock changed since we checked - rollback and return error
        await supabaseAdmin.from('orders').delete().eq('id', order.id)
        return NextResponse.json(
          { error: `Insufficient stock for product ${product.name}. Available: ${latestProduct.stock}` },
          { status: 409 }
        )
      }

      // Now update with the exact stock we expect (optimistic locking)
      const { error: stockUpdateError } = await supabaseAdmin
        .from('products')
        .update({
          stock: latestProduct.stock - item.qty,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id)
        .eq('business_id', resolvedBusinessId)
        .eq('stock', latestProduct.stock) // Only update if stock hasn't changed

      if (stockUpdateError) {
        // Rollback order
        await supabaseAdmin.from('orders').delete().eq('id', order.id)
        
        return NextResponse.json(
          { error: `Stock update failed for product ${product.name}. Please try again.` },
          { status: 409 }
        )
      }
    }

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Cleanup order before throwing — stock was already decremented, order must not remain without items
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    // Validate member_id if provided
    if (member_id) {
      const { data: member, error: memberFetchError } = await supabaseAdmin
        .from('members')
        .select('id, points, total_purchases, business_id')
        .eq('id', member_id)
        .eq('business_id', resolvedBusinessId)
        .single()

      if (memberFetchError || !member) {
        return NextResponse.json(
          { error: 'Member not found in your business' },
          { status: 404 }
        )
      }

      // Validate points used - prevent negative points
      if (points_used > 0) {
        if (member.points < points_used) {
          return NextResponse.json(
            { error: `Insufficient points. Available: ${member.points}, Requested: ${points_used}` },
            { status: 400 }
          )
        }

        // Create member transaction for points used
        await supabaseAdmin
          .from('member_transactions')
          .insert([{
            member_id,
            order_id: order.id,
            type: 'redeem',
            points: -points_used,
            description: `Redeemed ${points_used} points for order ${order.id.slice(0, 8)}`
          }])
      }

      // Create member transaction for points earned
      if (points_earned > 0) {
        await supabaseAdmin
          .from('member_transactions')
          .insert([{
            member_id,
            order_id: order.id,
            type: 'earn',
            points: points_earned,
            description: `Earned from order ${order.id.slice(0, 8)}`
          }])
      }

      // Atomic update member points - prevent race condition
      const newPoints = member.points + points_earned - points_used
      const { error: memberUpdateError } = await supabaseAdmin
        .from('members')
        .update({
          points: newPoints,
          total_purchases: member.total_purchases + total,
          updated_at: new Date().toISOString()
        })
        .eq('id', member_id)
        .eq('business_id', resolvedBusinessId)
        // Ensure points don't go negative (atomic check)
        .gte('points', points_used - points_earned)

      if (memberUpdateError) {
        // Rollback order and ALL member transactions for any error type.
        // Silently ignoring member update errors causes points to disappear permanently.
        await supabaseAdmin.from('orders').delete().eq('id', order.id)
        await supabaseAdmin
          .from('member_transactions')
          .delete()
          .eq('order_id', order.id)

        const isInsufficientPoints = memberUpdateError.code === 'PGRST116'
        return NextResponse.json(
          { error: isInsufficientPoints ? 'Insufficient points. Please try again.' : 'Failed to update member points. Please try again.' },
          { status: isInsufficientPoints ? 409 : 500 }
        )
      }
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error: unknown) {
    // Log full error internally for debugging (in production, use logging service)
    // Don't expose error details to client (security)

    const err = error as Record<string, unknown>
    
    // If we created an order but failed later, clean it up
    // This is a last resort - should have been cleaned up earlier
    const order = err?.context as string | undefined
    if (order) {
      try {
        await supabaseAdmin.from('orders').delete().eq('id', order)
      } catch (cleanupError) {
        // Ignore cleanup errors - order will be cleaned up by maintenance script
      }
    }

    // Check if it's a database constraint error
    const errorCode = err?.code as string | undefined
    if (errorCode?.startsWith('23')) {
      // Database constraint violation (foreign key, unique, etc.)
      return NextResponse.json(
        { error: 'Failed to create order. Please check your data and try again.' },
        { status: 400 }
      )
    }

    // Check if it's a connection error
    const errorMessage = err?.message as string | undefined
    if (errorMessage?.includes('fetch') || errorMessage?.includes('network')) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 503 }
      )
    }

    // Generic error message for production
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    )
  }
}
