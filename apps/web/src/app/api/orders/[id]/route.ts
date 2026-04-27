import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  forbiddenResponse,
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')

    if (businessId && businessId !== businessContext.businessId) {
      return forbiddenResponse('Cannot access another business')
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items(*, product:products(*)),
        member:members(name, phone)
      `)
      .eq('id', id)
      .eq('business_id', businessContext.businessId)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
