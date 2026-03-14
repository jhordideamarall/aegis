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
  } catch (error: any) {
    console.error('Error fetching admin businesses:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch businesses' },
      { status: 500 }
    )
  }
}
