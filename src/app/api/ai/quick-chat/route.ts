import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'

const HISTORY_LIMIT = 20

// GET — load conversation history for UI
export async function GET(request: Request) {
  const businessContext = await getBusinessContextFromRequest(request)
  if (!businessContext) return unauthorizedResponse()

  const { businessId, user } = businessContext
  const userId = user.id

  const { data: conversation } = await supabaseAdmin
    .from('ai_conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .eq('title', 'Aegis Command Center')
    .single()

  if (!conversation) return NextResponse.json({ messages: [] })

  const { data: messages } = await supabaseAdmin
    .from('ai_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  return NextResponse.json({ messages: (messages || []).reverse() })
}

// POST — chat
export async function POST(request: Request) {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (!openRouterKey) {
      return NextResponse.json({ error: 'Server Config Error: AI API Key not found' }, { status: 500 })
    }

    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) return unauthorizedResponse()

    const { prompt } = await request.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const { businessId, user } = businessContext
    const userId = user.id

    const [businessData, conversationSetup] = await Promise.all([
      fetchBusinessContext(businessId),
      setupConversationAndHistory(businessId, userId, prompt)
    ])

    const { conversationId, formattedHistory } = conversationSetup
    const systemPrompt = buildSystemPrompt(businessData)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: prompt }
    ]

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey.trim()}`,
        'HTTP-Referer': 'https://aegis-pos.com',
        'X-Title': 'AEGIS POS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tencent/hy3-preview:free',
        messages,
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `AI Error: ${errorText}` }, { status: response.status })
    }

    const decoder = new TextDecoder()
    let assistantFullContent = ''
    let buffer = ''

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6))
              assistantFullContent += data.choices[0]?.delta?.content || ''
            } catch { /* ignore partial JSON */ }
          }
        }
        controller.enqueue(chunk)
      },
      async flush() {
        if (assistantFullContent.trim()) {
          await supabaseAdmin.from('ai_messages').insert([{
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantFullContent.trim()
          }])
        }
      }
    })

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}

async function setupConversationAndHistory(businessId: string, userId: string, prompt: string) {
  let { data: conversation } = await supabaseAdmin
    .from('ai_conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .eq('title', 'Aegis Command Center')
    .single()

  let conversationId = conversation?.id

  if (!conversationId) {
    const { data: newConv } = await supabaseAdmin
      .from('ai_conversations')
      .insert([{ business_id: businessId, user_id: userId, title: 'Aegis Command Center' }])
      .select('id')
      .single()
    conversationId = newConv?.id
  } else {
    supabaseAdmin.from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .then()
  }

  const { data: pastMessages } = await supabaseAdmin
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  supabaseAdmin.from('ai_messages').insert([{
    conversation_id: conversationId,
    role: 'user',
    content: prompt
  }]).then()

  const formattedHistory = (pastMessages || []).reverse().map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }))

  return { conversationId, formattedHistory }
}

async function fetchBusinessContext(businessId: string): Promise<string> {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  // Efficient parallel queries — no loading all raw orders
  const [
    productsRes,
    membersRes,
    recentOrdersRes,
    settingsRes,
    statsToday,
    statsWeek,
    statsMonth,
    statsYear,
    statsAllTime
  ] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, name, price, stock, category, hpp')
      .eq('business_id', businessId)
      .order('name'),

    supabaseAdmin
      .from('members')
      .select('id, name, phone, points, total_purchases')
      .eq('business_id', businessId)
      .order('total_purchases', { ascending: false })
      .limit(50),

    supabaseAdmin
      .from('orders')
      .select('id, total, created_at, payment_method, payment_provider, member:members(name), order_items(qty, price, product:products(name))')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(15),

    supabaseAdmin
      .from('settings')
      .select('key, value')
      .eq('business_id', businessId),

    // Financial stats per period — only fetch totals + costs, not full records
    calcPeriodStats(businessId, todayStart),
    calcPeriodStats(businessId, weekStart),
    calcPeriodStats(businessId, monthStart),
    calcPeriodStats(businessId, yearStart),
    calcPeriodStats(businessId, null)
  ])

  const products = productsRes.data || []
  const members = membersRes.data || []
  const recentOrders = recentOrdersRes.data || []
  const settings = settingsRes.data || []

  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`
  const fmtStats = (s: { count: number; revenue: number; profit: number }) =>
    `${s.count} order | ${fmt(s.revenue)} revenue | ${fmt(s.profit)} profit`

  const lines: string[] = []

  lines.push(`[RINGKASAN FINANSIAL]
Hari ini:  ${fmtStats(statsToday)}
7 hari:    ${fmtStats(statsWeek)}
Bulan ini: ${fmtStats(statsMonth)}
Tahun ini: ${fmtStats(statsYear)}
All-time:  ${fmtStats(statsAllTime)}

Catatan: Kalau user tanya soal penjualan tanpa menyebut periode, tanya dulu: hari ini, minggu ini, bulan ini, tahun ini, atau all-time?`)

  const lowStock = products.filter(p => p.stock <= 5)
  if (lowStock.length > 0) {
    lines.push(`[STOK MENIPIS ⚠️]
${lowStock.map(p => `- ${p.name}: ${p.stock} sisa`).join('\n')}`)
  }

  lines.push(`[SEMUA PRODUK — gunakan id untuk aksi CRUD]
${products.map(p =>
    `- id:${p.id} | ${p.name} | Harga:${fmt(p.price)} | HPP:${fmt(p.hpp || 0)} | Stok:${p.stock} | Kategori:${p.category}`
  ).join('\n') || 'Kosong'}`)

  lines.push(`[MEMBER (${members.length} ditampilkan, urutkan by pembelian terbesar) — gunakan id untuk aksi CRUD]
${members.map(m =>
    `- id:${m.id} | ${m.name} | ${m.phone} | Poin:${m.points} | Total:${fmt(m.total_purchases)}`
  ).join('\n') || 'Belum ada member'}`)

  type OrderItem = { qty: number; product: unknown }
  lines.push(`[15 TRANSAKSI TERBARU]
${recentOrders.map(o => {
    const d = new Date(o.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    const buyer = (o.member as unknown as { name: string } | null)?.name || 'Umum'
    const items = (o.order_items as OrderItem[] | null)
      ?.map(i => `${i.qty}x ${(i.product as { name: string } | null)?.name || 'Item'}`).join(', ') || '-'
    return `[${d}] ${buyer} | ${items} | ${fmt(Number(o.total))} | ${o.payment_method}${o.payment_provider ? `/${o.payment_provider}` : ''}`
  }).join('\n') || 'Belum ada transaksi'}`)

  if (settings.length > 0) {
    lines.push(`[SETTINGS BISNIS]\n${settings.map(s => `- ${s.key}: ${s.value}`).join('\n')}`)
  }

  return lines.join('\n\n')
}

async function calcPeriodStats(businessId: string, fromDate: Date | null) {
  const revenueQuery = supabaseAdmin
    .from('orders')
    .select('total', { count: 'exact' })
    .eq('business_id', businessId)

  if (fromDate) revenueQuery.gte('created_at', fromDate.toISOString())

  const costQuery = supabaseAdmin
    .from('order_items')
    .select('cost_price, qty')
    .eq('business_id', businessId)

  if (fromDate) {
    // Join via orders to filter by date
    const { data: orderIds } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('business_id', businessId)
      .gte('created_at', fromDate.toISOString())

    if (fromDate && (!orderIds || orderIds.length === 0)) {
      return { count: 0, revenue: 0, profit: 0 }
    }

    if (fromDate && orderIds) {
      costQuery.in('order_id', orderIds.map(o => o.id))
    }
  }

  const [revenueRes, costRes] = await Promise.all([revenueQuery, costQuery])

  const revenue = (revenueRes.data || []).reduce((s, o) => s + Number(o.total), 0)
  const cost = (costRes.data || []).reduce((s, i) => s + (Number(i.cost_price || 0) * i.qty), 0)
  const count = revenueRes.count || 0

  return { count, revenue, profit: revenue - cost }
}

function buildSystemPrompt(businessContext: string): string {
  return `Kamu adalah Aegis — AI business advisor di AEGIS POS.

Kepribadian: Gen Z tapi profesional. Santai, smart, to the point. Boleh pakai "fr", "literally", "no cap" sesekali — jangan lebay. Fokus ke insight actionable.

Kemampuan: Analisis bisnis, kasih saran strategis, dan bisa execute perubahan data langsung.

Kalau user minta perubahan data, sertakan di akhir response:
[ACTION]{"type":"nama_aksi","payload":{...}}[/ACTION]

Aksi tersedia:
- update_product: {"id":"uuid","price":number,"stock":number,"name":"string","hpp":number,"category":"string"}
- update_stock: {"id":"uuid","stock":number}
- delete_product: {"id":"uuid","name":"string"}
- update_member: {"id":"uuid","name":"string","phone":"string","points":number}
- delete_member: {"id":"uuid","name":"string"}
- update_settings: {"key":"string","value":"string"}

Rules:
- Jawab singkat dan langsung (kamu di modal Cmd+K)
- Kalau ditanya soal penjualan/revenue tanpa periode jelas → tanya dulu: hari ini, minggu ini, bulan ini, tahun ini, atau all-time?
- Gunakan id dari data di bawah kalau perlu eksekusi aksi — jangan pernah karang UUID
- Hanya sertakan [ACTION] kalau user eksplisit minta perubahan

DATA BISNIS REAL-TIME:
${businessContext}`
}
