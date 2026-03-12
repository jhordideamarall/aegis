import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'

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

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    if (orderId) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items(*, product:products(*)),
          member:members(name, phone)
        `)
        .eq('id', orderId)
        .eq('business_id', businessId)
        .single()

      if (orderError) throw orderError
      return NextResponse.json(order)
    }

    // Parse dates - treat input as local dates (YYYY-MM-DD format from frontend)
    // Convert to Indonesian time (WIB - UTC+7)
    let rangeStart: Date | null = null
    let rangeEnd: Date | null = null

    if (startDate && endDate) {
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

      // Create dates in WIB timezone (UTC+7), then convert to UTC for database
      rangeStart = new Date(Date.UTC(startYear, (startMonth || 1) - 1, startDay || 1, 0, 0, 0, 0))
      rangeStart = new Date(rangeStart.getTime() - (7 * 3600000)) // Convert WIB to UTC
      
      rangeEnd = new Date(Date.UTC(endYear, (endMonth || 1) - 1, endDay || 1, 23, 59, 59, 999))
      rangeEnd = new Date(rangeEnd.getTime() - (7 * 3600000)) // Convert WIB to UTC

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
    } else if (startDate) {
      // Only startDate provided - treat as single day in WIB
      const [year, month, day] = startDate.split('-').map(Number)
      rangeStart = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0))
      rangeStart = new Date(rangeStart.getTime() - (7 * 3600000)) // Convert WIB to UTC
      
      rangeEnd = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 23, 59, 59, 999))
      rangeEnd = new Date(rangeEnd.getTime() - (7 * 3600000)) // Convert WIB to UTC
    }

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        member_id,
        total,
        payment_method,
        created_at,
        order_items(id),
        member:members(name, phone)
      `, { count: 'exact' })
      .eq('business_id', businessId)

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
      console.log('Searching orders with query:', search)

      // First, find matching members if any
      let memberIds: string[] = []
      const { data: matchingMembers, error: memberSearchError } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('business_id', businessId)
        .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)

      if (memberSearchError) {
        console.error('Error searching members:', memberSearchError)
      } else if (matchingMembers && matchingMembers.length > 0) {
        memberIds = matchingMembers.map(m => m.id)
      }

      console.log('Matching members:', memberIds.length)

      // Fetch all orders in the date range, then filter in memory
      query = query.order('created_at', { ascending: false })
      
      const { data: allOrders, error: fetchError } = await query.range(from, to)
      
      if (fetchError) throw fetchError
      
      // Filter orders in memory
      let filteredOrders = allOrders?.filter((order: any) => {
        // Match by order ID
        if (order.id.toLowerCase().includes(search.toLowerCase())) return true
        // Match by payment method
        if (order.payment_method.toLowerCase().includes(search.toLowerCase())) return true
        // Match by member ID
        if (memberIds.length > 0 && order.member_id && memberIds.includes(order.member_id)) return true
        return false
      }) || []
      
      // Also fetch matching member orders that might be outside the current page
      if (memberIds.length > 0) {
        const { data: extraMemberOrders } = await supabaseAdmin
          .from('orders')
          .select(`
            id,
            member_id,
            total,
            payment_method,
            created_at,
            order_items(id),
            member:members(name, phone)
          `)
          .eq('business_id', businessId)
          .in('member_id', memberIds)
          .order('created_at', { ascending: false })
          .limit(100)
        
        if (extraMemberOrders) {
          const existingIds = new Set(filteredOrders.map(o => o.id))
          extraMemberOrders.forEach(o => {
            if (!existingIds.has(o.id)) {
              filteredOrders.push(o)
            }
          })
          // Re-sort
          filteredOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }
      }
      
      // Apply pagination manually
      const total = filteredOrders.length
      const paginatedData = filteredOrders.slice(from, from + limit)
      
      // Calculate summary
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

    let summaryQuery = supabaseAdmin
      .from('orders')
      .select('total', { count: 'exact' })
      .eq('business_id', businessId)

    if (rangeStart) {
      summaryQuery = summaryQuery.gte('created_at', rangeStart.toISOString())
    }

    if (rangeEnd) {
      summaryQuery = summaryQuery.lte('created_at', rangeEnd.toISOString())
    }

    if (paymentMethod && paymentMethod !== 'all') {
      summaryQuery = summaryQuery.eq('payment_method', paymentMethod)
    }

    if (search) {
      // First, find matching members if any
      let memberIds: string[] = []
      const { data: matchingMembers } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('business_id', businessId)
        .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
      
      if (matchingMembers && matchingMembers.length > 0) {
        memberIds = matchingMembers.map(m => m.id)
      }
      
      // Build the filter conditions
      if (memberIds.length > 0) {
        summaryQuery = summaryQuery.or(`id.ilike.%${search}%,payment_method.ilike.%${search}%,member_id.in.(${memberIds.join(',')})`)
      } else {
        summaryQuery = summaryQuery.or(`id.ilike.%${search}%,payment_method.ilike.%${search}%`)
      }
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
    console.error('Error fetching orders:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      total,
      payment_method,
      member_id,
      points_earned = 0,
      points_used = 0,
      discount = 0,
      items,
      business_id
    } = body

    // Validation
    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order items are required' },
        { status: 400 }
      )
    }

    const statusCheck = await assertBusinessActive(business_id)
    if (!statusCheck.ok) {
      return NextResponse.json(
        { error: statusCheck.message },
        { status: statusCheck.status }
      )
    }

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        total,
        payment_method,
        member_id: member_id || null,
        points_earned,
        points_used,
        discount,
        business_id
      }])
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    const orderItems = items.map((item: { product_id: string; qty: number; price: number }) => ({
      order_id: order.id,
      product_id: item.product_id,
      qty: item.qty,
      price: item.price,
      business_id
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // Update product stock
    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (product) {
        await supabaseAdmin
          .from('products')
          .update({ stock: product.stock - item.qty })
          .eq('id', item.product_id)
      }
    }

    // Create member transaction for points earned
    if (member_id && points_earned > 0) {
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

    // Create member transaction for points used
    if (member_id && points_used > 0) {
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

    // Update member points and total purchases
    if (member_id) {
      // Fetch current member data
      const { data: member, error: memberFetchError } = await supabaseAdmin
        .from('members')
        .select('points, total_purchases')
        .eq('id', member_id)
        .single()

      if (!memberFetchError && member) {
        // Update with new values
        const { error: memberUpdateError } = await supabaseAdmin
          .from('members')
          .update({
            points: member.points + points_earned - points_used,
            total_purchases: member.total_purchases + total,
            updated_at: new Date().toISOString()
          })
          .eq('id', member_id)

        if (memberUpdateError) {
          console.error('Error updating member:', memberUpdateError)
        }
      }
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
