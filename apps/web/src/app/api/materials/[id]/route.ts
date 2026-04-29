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
      .from('raw_materials')
      .select('*, suppliers(name)')
      .eq('id', id)
      .eq('business_id', businessContext.businessId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ material: data })
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
    const { name, category, unit, cost_per_unit, stock, min_stock_level, supplier_id, is_active } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (unit !== undefined) updateData.unit = unit
    if (cost_per_unit !== undefined) updateData.cost_per_unit = cost_per_unit
    if (stock !== undefined) updateData.stock = stock
    if (min_stock_level !== undefined) updateData.min_stock_level = min_stock_level
    if (supplier_id !== undefined) {
      updateData.supplier_id = supplier_id && supplier_id.trim() ? supplier_id : null
    }
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessContext.businessId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ material: data })
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
      .from('raw_materials')
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