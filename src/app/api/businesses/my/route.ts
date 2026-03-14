import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'

export async function GET(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { data: businessUser, error: buError } = await supabaseAdmin
      .from('business_users')
      .select('business_id, role, businesses(*)')
      .eq('user_id', businessContext.user.id)
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
      user: { id: businessContext.user.id, email: businessContext.user.email }
    })
  } catch (error: any) {
    console.error('Error fetching business:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const picName = typeof body.pic_name === 'string' ? body.pic_name.trim() : ''

    const { data: business, error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        pic_name: picName || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessContext.businessId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ business })
  } catch (error: any) {
    console.error('Error updating business:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update business' },
      { status: 500 }
    )
  }
}
