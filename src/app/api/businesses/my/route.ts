import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const { data: businessUser, error: buError } = await supabaseAdmin
      .from('business_users')
      .select('business_id, role, businesses(*)')
      .eq('user_id', userId)
      .single()

    if (buError || !businessUser) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      business: businessUser.businesses,
      role: businessUser.role,
      user: { id: userId }
    })
  } catch (error: any) {
    console.error('Error fetching business:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business' },
      { status: 500 }
    )
  }
}
