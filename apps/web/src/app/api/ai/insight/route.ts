import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'

// In-memory cache: businessId → { text, generatedAt }
const cache = new Map<string, { text: string; generatedAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

async function buildContext(businessId: string) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const [
    { data: ordersToday },
    { data: ordersYesterday },
    { data: products },
    { data: topItems },
  ] = await Promise.all([
    // Today's orders
    supabaseAdmin
      .from('orders')
      .select('total_amount, payment_method')
      .eq('business_id', businessId)
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .lte('created_at', `${todayStr}T23:59:59.999Z`),

    // Yesterday's orders for comparison
    (() => {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      return supabaseAdmin
        .from('orders')
        .select('total_amount')
        .eq('business_id', businessId)
        .gte('created_at', `${yStr}T00:00:00.000Z`)
        .lte('created_at', `${yStr}T23:59:59.999Z`)
    })(),

    // All products (for low stock)
    supabaseAdmin
      .from('products')
      .select('name, stock, price')
      .eq('business_id', businessId),

    // Top selling items last 7 days via order_items
    (() => {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      return supabaseAdmin
        .from('order_items')
        .select('product_name, quantity')
        .gte('created_at', weekAgo.toISOString())
    })(),
  ])

  const revenueToday = (ordersToday || []).reduce((s, o) => s + (o.total_amount || 0), 0)
  const revenueYesterday = (ordersYesterday || []).reduce((s, o) => s + (o.total_amount || 0), 0)
  const orderCountToday = ordersToday?.length || 0

  const lowStockProducts = (products || [])
    .filter(p => p.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3)

  // Aggregate top items
  const itemQtyMap: Record<string, number> = {}
  ;(topItems || []).forEach(i => {
    itemQtyMap[i.product_name] = (itemQtyMap[i.product_name] || 0) + i.quantity
  })
  const topProducts = Object.entries(itemQtyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  return `
Data bisnis hari ini:
- Revenue hari ini: ${fmt(revenueToday)} (${orderCountToday} transaksi)
- Revenue kemarin: ${fmt(revenueYesterday)}
- Perubahan: ${revenueYesterday > 0 ? ((revenueToday - revenueYesterday) / revenueYesterday * 100).toFixed(1) : 'N/A'}%
- Produk stok menipis (≤5): ${lowStockProducts.length > 0 ? lowStockProducts.map(p => `${p.name} (${p.stock} sisa)`).join(', ') : 'tidak ada'}
- Produk terlaris 7 hari: ${topProducts.length > 0 ? topProducts.map(([n, q]) => `${n} (${q}x)`).join(', ') : 'belum ada data'}
  `.trim()
}

export async function GET(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) return unauthorizedResponse()

    const { businessId } = businessContext

    // Check cache
    const cached = cache.get(businessId)
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
      return NextResponse.json({ insight: cached.text, cached: true })
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (!openRouterKey) {
      return NextResponse.json({ insight: null, error: 'AI not configured' })
    }

    const context = await buildContext(businessId)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey.trim()}`,
        'HTTP-Referer': 'https://aegis-pos.com',
        'X-Title': 'AEGIS POS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        messages: [
          {
            role: 'system',
            content: `Kamu adalah asisten bisnis yang proaktif. Berdasarkan data POS yang diberikan, buat 2-3 observasi singkat, kasual, dan actionable dalam bahasa Indonesia.
Format: bullet points pendek (maks 15 kata per poin). Fokus pada anomali, peluang, atau peringatan yang penting.
Jangan ulang angka verbatim — interpretasikan. Jangan pakai emoji berlebihan. Tone: friendly tapi profesional.`
          },
          { role: 'user', content: context }
        ],
        stream: false,
        max_tokens: 300,
        temperature: 0.7,
      })
    })

    if (!response.ok) {
      return NextResponse.json({ insight: null, error: 'AI unavailable' })
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content?.trim() || null

    if (text) {
      cache.set(businessId, { text, generatedAt: Date.now() })
    }

    return NextResponse.json({ insight: text })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ insight: null, error: msg })
  }
}
