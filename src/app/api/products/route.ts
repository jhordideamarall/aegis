import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.max(parseInt(searchParams.get('limit') || '20', 10), 1)
    const from = (page - 1) * limit
    const to = from + limit - 1

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('products')
      .select('id,name,price,stock,category,created_at', { count: 'exact' })
      .eq('business_id', businessId)
      .order('name')

    if (q) {
      query = query.ilike('name', `%${q}%`)
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
    const body = await request.json()
    const { name, price, stock, category, business_id } = body

    // Validation
    if (!name || !business_id) {
      return NextResponse.json(
        { error: 'Name and business_id are required' },
        { status: 400 }
      )
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
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

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([{
        name,
        price,
        stock: stock || 0,
        category: category || '',
        business_id
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
