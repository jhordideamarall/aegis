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
    const { name, price, hpp, stock, category, business_id } = body
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

    // Validation
    if (typeof price !== 'undefined' && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      )
    }

    if (typeof hpp !== 'undefined' && (typeof hpp !== 'number' || hpp < 0)) {
      return NextResponse.json(
        { error: 'HPP must be a positive number' },
        { status: 400 }
      )
    }

    // Check if product exists in this business
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('business_id', resolvedBusinessId)
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
        hpp,
        stock,
        category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', resolvedBusinessId)
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

    // Check if product exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('id', id)
      .eq('business_id', resolvedBusinessId)
      .single()

    if (fetchError || !existing) {
      console.error('Product not found:', id)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const statusCheck = await assertBusinessActive(resolvedBusinessId)
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
      .eq('business_id', resolvedBusinessId)

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
  } catch (error) {
    // Log internally for debugging (use structured logging service in production)
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
