import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, email, points, business_id } = body

    // Validation
    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    const statusCheck = await assertBusinessActive(business_id)
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
      .eq('business_id', business_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check for duplicate phone (excluding current member)
    if (phone) {
      const { data: duplicate } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('business_id', business_id)
        .eq('phone', phone)
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
        phone,
        email,
        points,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', business_id)
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
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    const statusCheck = await assertBusinessActive(businessId)
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
      .eq('business_id', businessId)

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
