import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Cache stats for 1 minute to speed up responses
interface CachedStats {
  stats: {
    totalBusinesses: number
    totalOrders: number
    totalMembers: number
    totalProducts: number
  }
  timestamp: number
}

let cachedStats: CachedStats | null = null
const CACHE_DURATION = 60000 // 1 minute

export async function GET(request: Request) {
  // Check if admin access is restricted
  const adminEmails = process.env.ADMIN_EMAILS
  const isRestricted = adminEmails && adminEmails.length > 0
  
  // If restricted, require authentication
  if (isRestricted) {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify user is admin
    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 403 }
      )
    }
    
    const allowedEmails = adminEmails.split(',').map(e => e.trim().toLowerCase())
    if (!allowedEmails.includes(user.email.toLowerCase())) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
  }
  
  // Return cached response if still valid
  const now = Date.now()
  if (cachedStats && now - cachedStats.timestamp < CACHE_DURATION) {
    return NextResponse.json(cachedStats.stats)
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

    // Cache the result
    cachedStats = {
      stats,
      timestamp: now
    }

    return NextResponse.json(stats)
  } catch (error) {
    // Log internally for debugging (use structured logging service in production)
    // Don't expose internal error details to client
    // Return cached data if available, otherwise zeros
    return NextResponse.json(
      cachedStats?.stats || {
        totalBusinesses: 0,
        totalOrders: 0,
        totalMembers: 0,
        totalProducts: 0
      }
    )
  }
}
