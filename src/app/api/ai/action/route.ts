import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'

type ActionType =
  | 'update_product'
  | 'update_stock'
  | 'delete_product'
  | 'update_member'
  | 'delete_member'
  | 'update_settings'

interface ActionPayload {
  id?: string
  name?: string
  price?: number
  stock?: number
  hpp?: number
  category?: string
  phone?: string
  points?: number
  key?: string
  value?: string
}

export async function POST(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) return unauthorizedResponse()

    const { businessId } = businessContext
    const body = await request.json()
    const { type, payload }: { type: ActionType; payload: ActionPayload } = body

    if (!type || !payload) {
      return NextResponse.json({ error: 'type and payload are required' }, { status: 400 })
    }

    switch (type) {
      case 'update_product': {
        if (!payload.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (payload.price !== undefined) updates.price = payload.price
        if (payload.stock !== undefined) updates.stock = payload.stock
        if (payload.name !== undefined) updates.name = payload.name
        if (payload.hpp !== undefined) updates.hpp = payload.hpp
        if (payload.category !== undefined) updates.category = payload.category
        const { data: updatedP, error } = await supabaseAdmin
          .from('products').update(updates).eq('id', payload.id).eq('business_id', businessId).select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!updatedP?.length) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
        return NextResponse.json({ success: true, message: `Produk berhasil diupdate` })
      }

      case 'update_stock': {
        if (!payload.id || payload.stock === undefined) {
          return NextResponse.json({ error: 'id and stock required' }, { status: 400 })
        }
        const { data: updatedS, error } = await supabaseAdmin
          .from('products').update({ stock: payload.stock, updated_at: new Date().toISOString() }).eq('id', payload.id).eq('business_id', businessId).select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!updatedS?.length) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
        return NextResponse.json({ success: true, message: `Stok berhasil diupdate` })
      }

      case 'delete_product': {
        if (!payload.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data: deletedP, error } = await supabaseAdmin
          .from('products').delete().eq('id', payload.id).eq('business_id', businessId).select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!deletedP?.length) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
        return NextResponse.json({ success: true, message: `Produk "${payload.name}" berhasil dihapus` })
      }

      case 'update_member': {
        if (!payload.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (payload.name !== undefined) updates.name = payload.name
        if (payload.phone !== undefined) updates.phone = payload.phone
        if (payload.points !== undefined) updates.points = payload.points
        const { data: updatedM, error } = await supabaseAdmin
          .from('members').update(updates).eq('id', payload.id).eq('business_id', businessId).select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!updatedM?.length) return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 })
        return NextResponse.json({ success: true, message: `Member berhasil diupdate` })
      }

      case 'delete_member': {
        if (!payload.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data: deletedM, error } = await supabaseAdmin
          .from('members').delete().eq('id', payload.id).eq('business_id', businessId).select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!deletedM?.length) return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 })
        return NextResponse.json({ success: true, message: `Member "${payload.name}" berhasil dihapus` })
      }

      case 'update_settings': {
        if (!payload.key || payload.value === undefined) {
          return NextResponse.json({ error: 'key and value required' }, { status: 400 })
        }
        const { error } = await supabaseAdmin
          .from('settings')
          .upsert({ business_id: businessId, key: payload.key, value: payload.value, updated_at: new Date().toISOString() },
            { onConflict: 'business_id,key' })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, message: `Setting "${payload.key}" berhasil diupdate` })
      }

      default:
        return NextResponse.json({ error: 'Unknown action type' }, { status: 400 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}
