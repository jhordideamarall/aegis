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
  } catch (error) {
    // Log internally for debugging (use structured logging service in production)
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to fetch business' },
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
    const { 
      business_name, 
      business_phone, 
      business_email, 
      business_address,
      pic_name 
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (typeof business_name === 'string') updateData.business_name = business_name.trim()
    if (typeof business_phone === 'string') updateData.phone = business_phone.trim()
    if (typeof business_email === 'string') updateData.email = business_email.trim()
    if (typeof business_address === 'string') updateData.address = business_address.trim()
    if (typeof pic_name === 'string') updateData.pic_name = pic_name.trim()

    const { data: business, error: updateError } = await supabaseAdmin
      .from('businesses')
      .update(updateData)
      .eq('id', businessContext.businessId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ business })
  } catch (error) {
    console.error('Error updating business:', error)
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    )
  }
}
