import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySetupToken } from '@/lib/setupToken'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_id, settings, setup_token } = body

    if (!business_id || !setup_token) {
      return NextResponse.json(
        { error: 'business_id and setup_token are required' },
        { status: 400 }
      )
    }

    const tokenVerification = verifySetupToken(setup_token, business_id)

    if (!tokenVerification.ok) {
      return NextResponse.json(
        { error: tokenVerification.error },
        { status: 403 }
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
