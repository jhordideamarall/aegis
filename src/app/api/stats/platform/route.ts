import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Cache stats for 1 minute to speed up responses
let cachedStats: any = null
let cacheTime = 0
const CACHE_DURATION = 60000 // 1 minute

export async function GET() {
  // Return cached response if still valid
  const now = Date.now()
  if (cachedStats && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedStats)
  }

  try {
    // Get all counts in parallel for faster response
    const [businessesResult, ordersResult, membersResult, productsResult] = await Promise.all([
      supabaseAdmin.from('businesses').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('members').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true })
    ])

    if (businessesResult.error) throw businessesResult.error
    if (ordersResult.error) throw ordersResult.error
    if (membersResult.error) throw membersResult.error
    if (productsResult.error) throw productsResult.error

    const stats = {
      totalBusinesses: businessesResult.count || 0,
      totalOrders: ordersResult.count || 0,
      totalMembers: membersResult.count || 0,
      totalProducts: productsResult.count || 0
    }

    // Update cache
    cachedStats = stats
    cacheTime = now

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error fetching platform stats:', error)
    // Return cached data if available, otherwise zeros
    return NextResponse.json(cachedStats || {
      totalBusinesses: 0,
      totalOrders: 0,
      totalMembers: 0,
      totalProducts: 0
    })
  }
}
