import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Get total businesses count
    const { count: totalBusinesses, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*', { count: 'exact', head: true })

    if (businessError) throw businessError

    // Get total orders count across all businesses
    const { count: totalOrders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })

    if (orderError) throw orderError

    // Get total members count across all businesses
    const { count: totalMembers, error: memberError } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })

    if (memberError) throw memberError

    // Get total products count across all businesses
    const { count: totalProducts, error: productError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })

    if (productError) throw productError

    return NextResponse.json({
      totalBusinesses: totalBusinesses || 0,
      totalOrders: totalOrders || 0,
      totalMembers: totalMembers || 0,
      totalProducts: totalProducts || 0
    })
  } catch (error: any) {
    console.error('Error fetching platform stats:', error)
    // Return default values if error (don't expose error to client)
    return NextResponse.json({
      totalBusinesses: 0,
      totalOrders: 0,
      totalMembers: 0,
      totalProducts: 0
    })
  }
}
