import { NextResponse } from 'next/server'
import { getOrderPaymentColumnSupport } from '@/lib/orderPaymentColumns'
import { supabaseAdmin } from '@/lib/supabase'
import {
  forbiddenResponse,
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'

interface ReportRow {
  id: string
  member_id: string | null
  total: number
  payment_method: string
  payment_provider?: string | null
  payment_proof_url?: string | null
  payment_proof_path?: string | null
  payment_proof_uploaded_at?: string | null
  payment_notes?: string | null
  created_at: string
  order_items?: Array<{
    id: string
    product_id: string
    qty: number
    price: number
    product?: { name?: string | null } | null
  }>
  member?: { name: string; phone: string } | Array<{ name: string; phone: string }> | null
}

export async function GET(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    const paymentMethod = searchParams.get('payment_method')
    const search = (searchParams.get('q') || '').trim()
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (businessId && businessId !== businessContext.businessId) {
      return forbiddenResponse('Cannot access another business')
    }

    const resolvedBusinessId = businessContext.businessId

    const paymentColumnSupport = await getOrderPaymentColumnSupport()

    const selectClause = [
      'id',
      'member_id',
      'total',
      'payment_method',
      paymentColumnSupport.provider ? 'payment_provider' : null,
      paymentColumnSupport.proof ? 'payment_proof_url' : null,
      paymentColumnSupport.proof ? 'payment_proof_path' : null,
      paymentColumnSupport.proof ? 'payment_proof_uploaded_at' : null,
      paymentColumnSupport.notes ? 'payment_notes' : null,
      'created_at',
      'order_items(id, product_id, qty, price, product:products(name))',
      'member:members(name, phone)'
    ]
      .filter(Boolean)
      .join(',\n        ')

    let rangeStart: Date | null = null
    let rangeEnd: Date | null = null

    if (startDate && endDate) {
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

      rangeStart = new Date(Date.UTC(startYear, (startMonth || 1) - 1, startDay || 1, 0, 0, 0, 0))
      rangeStart = new Date(rangeStart.getTime() - (7 * 3600000))

      rangeEnd = new Date(Date.UTC(endYear, (endMonth || 1) - 1, endDay || 1, 23, 59, 59, 999))
      rangeEnd = new Date(rangeEnd.getTime() - (7 * 3600000))
    } else if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number)
      rangeStart = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0))
      rangeStart = new Date(rangeStart.getTime() - (7 * 3600000))
      rangeEnd = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 23, 59, 59, 999))
      rangeEnd = new Date(rangeEnd.getTime() - (7 * 3600000))
    }

    let query = supabaseAdmin
      .from('orders')
      .select(selectClause)
      .eq('business_id', resolvedBusinessId)

    if (rangeStart) {
      query = query.gte('created_at', rangeStart.toISOString())
    }

    if (rangeEnd) {
      query = query.lte('created_at', rangeEnd.toISOString())
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod)
    }

    query = query.order('created_at', { ascending: false })

    const allOrders: ReportRow[] = []
    const pageSize = 500
    let from = 0
    let shouldContinue = true

    while (shouldContinue) {
      const { data, error } = await query.range(from, from + pageSize - 1)

      if (error) throw error

      const batch = ((data || []) as unknown) as ReportRow[]
      allOrders.push(...batch)

      shouldContinue = batch.length === pageSize
      from += pageSize
    }

    let orders = allOrders

    if (search) {
      let memberIds: string[] = []
      const { data: matchingMembers } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('business_id', resolvedBusinessId)
        .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)

      if (matchingMembers?.length) {
        memberIds = matchingMembers.map((member) => member.id)
      }

      orders = orders.filter((order) => {
        if (order.id.toLowerCase().includes(search.toLowerCase())) return true
        if (order.payment_method.toLowerCase().includes(search.toLowerCase())) return true
        if (paymentColumnSupport.provider && order.payment_provider?.toLowerCase().includes(search.toLowerCase())) return true
        if (paymentColumnSupport.notes && order.payment_notes?.toLowerCase().includes(search.toLowerCase())) return true
        if (memberIds.length > 0 && order.member_id && memberIds.includes(order.member_id)) return true
        return false
      })
    }

    const normalizedOrders = orders.map((order) => ({
      ...order,
      member: Array.isArray(order.member) ? order.member[0] || null : order.member
    }))

    return NextResponse.json({
      data: normalizedOrders,
      total: normalizedOrders.length
    })
  } catch (error) {
    console.error('Error generating orders report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate orders report', details: errorMessage },
      { status: 500 }
    )
  }
}
