import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'
import {
  forbiddenResponse,
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'
import { escapeILikePattern } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.max(parseInt(searchParams.get('limit') || '20', 10), 1)
    const from = (page - 1) * limit
    const to = from + limit - 1

    if (businessId && businessId !== businessContext.businessId) {
      return forbiddenResponse('You do not have access to this business')
    }

    let query = supabaseAdmin
      .from('products')
      .select('id,name,price,hpp,stock,category,created_at', { count: 'exact' })
      .eq('business_id', businessContext.businessId)
      .order('name')

    if (q) {
      const escapedQ = escapeILikePattern(q)
      query = query.ilike('name', `%${escapedQ}%`)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error, count } = await query.range(from, to)

    if (error) throw error
    return NextResponse.json({ data: data || [], total: count || 0, page, limit })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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
    const { name, price, hpp, stock, category, business_id } = body
    const resolvedBusinessId = businessContext.businessId

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (business_id && business_id !== resolvedBusinessId) {
      return forbiddenResponse('You do not have access to this business')
    }

    if (typeof price !== 'number' || price < 0) {
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

    const statusCheck = await assertBusinessActive(resolvedBusinessId)
    if (!statusCheck.ok) {
      return NextResponse.json(
        { error: statusCheck.message },
        { status: statusCheck.status }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([{
        name,
        price,
        hpp: hpp || 0,
        stock: stock || 0,
        category: category || '',
        business_id: resolvedBusinessId
      }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
