import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'

export async function GET(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('business_id', businessContext.businessId)

    if (q) {
      query = query.ilike('name', `%${q}%`)
    }

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query.order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, contact_name, phone, email, address, notes, is_active } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .insert([{
        business_id: businessContext.businessId,
        name,
        contact_name,
        phone,
        email,
        address,
        notes,
        is_active: is_active !== false
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ supplier: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}