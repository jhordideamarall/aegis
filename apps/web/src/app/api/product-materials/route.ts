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
    const productId = searchParams.get('product_id')

    let query = supabaseAdmin
      .from('product_materials')
      .select('*, raw_materials(name, category, unit, cost_per_unit, stock), products(name)')
      .eq('business_id', businessContext.businessId)

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data, error } = await query

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
    const { product_id, materials, business_id } = body

    // Bulk mode: save multiple materials at once
    if (materials && Array.isArray(materials)) {
      if (!product_id) {
        return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
      }

      // Get existing mappings for this product
      const { data: existingMappings } = await supabaseAdmin
        .from('product_materials')
        .select('id, material_id')
        .eq('product_id', product_id)
        .eq('business_id', businessContext.businessId)

      const existingMap = new Map(existingMappings?.map(m => [m.material_id, m.id]) || [])
      const newMaterialIds = new Set(materials.map(m => m.material_id))

      // Delete materials that are no longer linked
      const toDelete = existingMappings?.filter(m => !newMaterialIds.has(m.material_id)).map(m => m.id) || []
      if (toDelete.length > 0) {
        await supabaseAdmin.from('product_materials').delete().in('id', toDelete)
      }

      // Upsert each material
      for (const m of materials) {
        if (existingMap.has(m.material_id)) {
          await supabaseAdmin
            .from('product_materials')
            .update({ qty_needed: m.qty_needed || 1, is_active: true })
            .eq('id', existingMap.get(m.material_id))
        } else {
          await supabaseAdmin
            .from('product_materials')
            .insert([{
              business_id: businessContext.businessId,
              product_id,
              material_id: m.material_id,
              qty_needed: m.qty_needed || 1,
              is_active: true
            }])
        }
      }

      return NextResponse.json({ success: true })
    }

    // Single mode (backwards compatibility)
    const { material_id, qty_needed, is_active } = body

    if (!product_id || !material_id) {
      return NextResponse.json({ error: 'product_id and material_id are required' }, { status: 400 })
    }

    // Upsert (update if exists, insert if not)
    const { data: existing } = await supabaseAdmin
      .from('product_materials')
      .select('id')
      .eq('product_id', product_id)
      .eq('material_id', material_id)
      .single()

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('product_materials')
        .update({ qty_needed: qty_needed || 1, is_active: is_active !== false })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ mapping: data })
    } else {
      const { data, error } = await supabaseAdmin
        .from('product_materials')
        .insert([{
          business_id: businessContext.businessId,
          product_id,
          material_id,
          qty_needed: qty_needed || 1,
          is_active: is_active !== false
        }])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ mapping: data })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('product_materials')
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