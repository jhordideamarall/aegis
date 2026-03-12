import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_id, settings } = body

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    const { error: settingsError } = await supabaseAdmin
      .from('businesses')
      .update({ settings })
      .eq('id', business_id)

    if (settingsError) throw settingsError

    return NextResponse.json({
      success: true,
      redirect_url: '/dashboard'
    })
  } catch (error: any) {
    console.error('Error completing setup:', error)
    return NextResponse.json(
      { error: error.message || 'Setup failed' },
      { status: 500 }
    )
  }
}
