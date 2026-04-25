import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'
import {
  forbiddenResponse,
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()
    const { name, phone, email, points, business_id } = body
    const resolvedBusinessId = businessContext.businessId

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

    // Check if member exists in this business
    const { data: existing } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('id', id)
      .eq('business_id', resolvedBusinessId)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Normalize and validate phone if provided
    let normalizedPhone = phone
    if (phone) {
      normalizedPhone = phone.replace(/[\s\-\(\)]/g, '')
      const phoneRegex = /^(\+62|62|0)8[0-9]{8,11}$/
      if (!phoneRegex.test(normalizedPhone)) {
        return NextResponse.json(
          { error: 'Invalid phone format. Use 08xxxxxxxxxx, 62xxxxxxxxxx, or +62xxxxxxxxxx' },
          { status: 400 }
        )
      }

      const { data: duplicate } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('business_id', resolvedBusinessId)
        .eq('phone', normalizedPhone)
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'Phone already exists' },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from('members')
      .update({
        name,
        phone: normalizedPhone,
        email,
        points,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', resolvedBusinessId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    const resolvedBusinessId = businessContext.businessId

    if (businessId && businessId !== resolvedBusinessId) {
      return forbiddenResponse('You do not have access to this business')
    }

    const statusCheck = await assertBusinessActive(resolvedBusinessId)
    if (!statusCheck.ok) {
      return NextResponse.json(
        { error: statusCheck.message },
        { status: statusCheck.status }
      )
    }

    const { error } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('id', id)
      .eq('business_id', resolvedBusinessId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting member:', error)
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    )
  }
}
