import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessContext.businessId)
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()
    const { name, contact_name, phone, email, address, notes, is_active } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (contact_name !== undefined) updateData.contact_name = contact_name
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (address !== undefined) updateData.address = address
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessContext.businessId)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const { error } = await supabaseAdmin
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('business_id', businessContext.businessId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}