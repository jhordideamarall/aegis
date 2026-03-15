import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'
import {
  forbiddenResponse,
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
    const search = searchParams.get('q') || ''
    const businessId = searchParams.get('business_id')
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.max(parseInt(searchParams.get('limit') || '20', 10), 1)
    const from = (page - 1) * limit
    const to = from + limit - 1

    if (businessId && businessId !== businessContext.businessId) {
      return forbiddenResponse('You do not have access to this business')
    }

    let query = supabaseAdmin
      .from('members')
      .select('id,name,phone,email,points,total_purchases,created_at,updated_at', { count: 'exact' })
      .eq('business_id', businessContext.businessId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
      query = query.order('name')
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error, count } = await query.range(from, to)

    if (error) throw error
    return NextResponse.json({ data: data || [], total: count || 0, page, limit })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, phone, email, business_id, points = 0 } = body
    const resolvedBusinessId = businessContext.businessId

    // Validation
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    if (business_id && business_id !== resolvedBusinessId) {
      return forbiddenResponse('You do not have access to this business')
    }

    const statusCheck = await assertBusinessActive(resolvedBusinessId)
    if (!statusCheck.ok) {
      return NextResponse.json(
        { error: statusCheck.message },
        { status: statusCheck.status }
      )
    }

    // Validate phone format - support Indonesian and international formats
    // Accept: 08xxxxxxxxxx, 62xxxxxxxxxx, +62xxxxxxxxxx
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '')
    const phoneRegex = /^(\+62|62|0)8[0-9]{8,11}$/
    
    if (!phoneRegex.test(cleanedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone format. Use 08xxxxxxxxxx, 62xxxxxxxxxx, or +62xxxxxxxxxx (8-11 digits after 08/62)' },
        { status: 400 }
      )
    }
    
    // Additional validation: check length after cleaning
    const digitsOnly = cleanedPhone.replace(/\D/g, '')
    if (digitsOnly.length < 10 || digitsOnly.length > 14) {
      return NextResponse.json(
        { error: 'Phone number must be 10-14 digits' },
        { status: 400 }
      )
    }

    // Check for duplicate phone within same business
    const { data: existing } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('business_id', resolvedBusinessId)
      .eq('phone', phone)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Member with this phone already exists' },
        { status: 409 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('members')
      .insert([{ name, phone, email: email || null, business_id: resolvedBusinessId, points }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating member:', error)
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    )
  }
}
