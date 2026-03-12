import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, price, stock, category, business_id } = body

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

    // Check if product exists in this business
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('business_id', business_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        name,
        price,
        stock,
        category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', business_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
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
      console.error('Missing business_id')
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    // Check if product exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('id', id)
      .eq('business_id', businessId)
      .single()

    if (fetchError || !existing) {
      console.error('Product not found:', id)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
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
      .from('products')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId)

    if (error) {
      console.error('Delete error:', error)
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        return NextResponse.json(
          { error: 'Cannot delete product. This product is used in existing orders.' },
          { status: 400 }
        )
      }
      
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}
