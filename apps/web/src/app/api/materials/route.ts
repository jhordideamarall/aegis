import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabaseAdmin
      .from('raw_materials')
      .select('*, suppliers(name)')
      .eq('business_id', businessContext.businessId)

    if (q) {
      query = query.ilike('name', `%${q}%`)
    }

    if (category) {
      query = query.eq('category', category)
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
    const { name, category, unit, cost_per_unit, stock, min_stock_level, supplier_id, is_active } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const insertData: Record<string, unknown> = {
      business_id: businessContext.businessId,
      name,
      category: category || 'consumable',
      unit: unit || 'pcs',
      cost_per_unit: cost_per_unit || 0,
      stock: stock || 0,
      min_stock_level: min_stock_level || 0,
      is_active: is_active !== false
    }

    if (supplier_id && supplier_id.trim()) {
      insertData.supplier_id = supplier_id
    }

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .insert([insertData])
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