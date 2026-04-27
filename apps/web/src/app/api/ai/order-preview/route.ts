import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'

interface OrderItem {
  product_name: string
  qty: number
}

interface MatchedItem {
  product_id: string
  product_name: string
  qty: number
  unit_price: number
  subtotal: number
  matched_query: string
}

interface UnmatchedItem {
  query: string
  qty: number
}

// Fuzzy match: normalize & score
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function matchScore(query: string, name: string): number {
  const q = normalize(query)
  const n = normalize(name)
  if (n === q) return 100
  if (n.includes(q) || q.includes(n)) return 80
  const qTokens = q.split(/\s+/)
  const nTokens = n.split(/\s+/)
  const commonTokens = qTokens.filter(t => nTokens.some(nt => nt.includes(t) || t.includes(nt)))
  if (commonTokens.length > 0) return 50 + (commonTokens.length / Math.max(qTokens.length, nTokens.length)) * 30
  return 0
}

export async function POST(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) return unauthorizedResponse()

    const { businessId } = businessContext
    const body = await request.json()
    const { items, payment_method = 'cash' }: { items: OrderItem[]; payment_method: string } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items required' }, { status: 400 })
    }

    // Fetch all products for fuzzy matching
    const { data: products, error: pErr } = await supabaseAdmin
      .from('products')
      .select('id, name, price, stock')
      .eq('business_id', businessId)

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    if (!products?.length) return NextResponse.json({ error: 'Tidak ada produk' }, { status: 404 })

    // Fetch settings for tax/service
    const { data: settingsRows } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .eq('business_id', businessId)

    const settings: Record<string, string> = {}
    settingsRows?.forEach(s => { settings[s.key] = s.value })
    const taxEnabled = settings.tax_enabled === 'true'
    const taxRate = taxEnabled ? (Number(settings.tax_rate) || 0) / 100 : 0
    const serviceEnabled = settings.service_enabled === 'true'
    const serviceRate = serviceEnabled ? (Number(settings.service_rate) || 0) / 100 : 0

    const matched: MatchedItem[] = []
    const unmatched: UnmatchedItem[] = []

    for (const item of items) {
      const scores = products.map(p => ({ p, score: matchScore(item.product_name, p.name) }))
      const best = scores.sort((a, b) => b.score - a.score)[0]

      if (best.score >= 40) {
        const qty = Math.max(1, Math.floor(item.qty))
        const existing = matched.find(m => m.product_id === best.p.id)
        if (existing) {
          existing.qty += qty
          existing.subtotal = existing.qty * existing.unit_price
        } else {
          matched.push({
            product_id: best.p.id,
            product_name: best.p.name,
            qty,
            unit_price: best.p.price,
            subtotal: qty * best.p.price,
            matched_query: item.product_name,
          })
        }
      } else {
        unmatched.push({ query: item.product_name, qty: item.qty })
      }
    }

    if (matched.length === 0) {
      return NextResponse.json({ error: 'Tidak ada produk yang cocok ditemukan', unmatched }, { status: 404 })
    }

    const subtotal = matched.reduce((sum, m) => sum + m.subtotal, 0)
    const serviceAmount = Math.round(subtotal * serviceRate)
    const taxBase = subtotal + serviceAmount
    const taxAmount = Math.round(taxBase * taxRate)
    const total = subtotal + serviceAmount + taxAmount

    return NextResponse.json({
      items: matched,
      unmatched,
      subtotal,
      service_amount: serviceAmount,
      tax_amount: taxAmount,
      total,
      payment_method,
      tax_enabled: taxEnabled,
      service_enabled: serviceEnabled,
      tax_rate: Number(settings.tax_rate) || 0,
      service_rate: Number(settings.service_rate) || 0,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
