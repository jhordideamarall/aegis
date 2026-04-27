import { NextResponse } from 'next/server'
import { getAdminUserFromRequest } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const adminUser = await getAdminUserFromRequest(request)

    if (!adminUser) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    // Log internally for debugging (use structured logging service in production)
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    )
  }
}
