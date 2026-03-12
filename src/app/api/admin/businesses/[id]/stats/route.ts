import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Fetch orders with optional date filter
    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('total, created_at')
      .eq('business_id', businessId)
    
    if (startDate && endDate) {
      ordersQuery = ordersQuery.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59.999Z')
    }
    
    const { data: orders } = await ordersQuery

    // Fetch members count
    const { count: totalMembers } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    // Fetch products count
    const { count: totalProducts } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    // Calculate stats
    const totalOrders = orders?.length || 0
    const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0
    
    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      totalMembers: totalMembers || 0,
      totalProducts: totalProducts || 0,
      todayOrders: totalOrders, // For time-filtered queries, this is the filtered count
      todayRevenue: totalRevenue, // For time-filtered queries, this is the filtered revenue
      avgOrderValue
    })
  } catch (error) {
    console.error('Error fetching business stats:', error)
    return NextResponse.json({
      totalOrders: 0,
      totalRevenue: 0,
      totalMembers: 0,
      totalProducts: 0,
      todayOrders: 0,
      todayRevenue: 0,
      avgOrderValue: 0
    })
  }
}
