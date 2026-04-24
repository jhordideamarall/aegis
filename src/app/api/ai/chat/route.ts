import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'

const HISTORY_LIMIT = 30
const contextCache = new Map<string, { data: string; ts: number }>()
const CACHE_TTL = 60_000

export async function POST(request: Request) {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (!openRouterKey) return NextResponse.json({ error: 'Server Config Error: AI API Key not found' }, { status: 500 })

    const ctx = await getBusinessContextFromRequest(request)
    if (!ctx) return unauthorizedResponse()

    const { businessId, user } = ctx
    const body = await request.json() as { conversationId?: string; prompt: string }
    const { prompt } = body
    let { conversationId } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // Create conversation inline if not provided (saves 1 round-trip)
    if (!conversationId) {
      const title = prompt.trim().slice(0, 50) + (prompt.trim().length > 50 ? '...' : '')
      const { data: newConv } = await supabaseAdmin
        .from('ai_conversations')
        .insert([{ business_id: businessId, user_id: user.id, title }])
        .select('id')
        .single()
      if (!newConv?.id) return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      conversationId = newConv.id
    } else {
      // Verify ownership
      const { data: conversation } = await supabaseAdmin
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .single()
      if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const convId = conversationId as string

    const [businessData, historyData] = await Promise.all([
      fetchBusinessContext(businessId),
      loadHistory(convId, prompt)
    ])

    const systemPrompt = buildSystemPrompt(businessData)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyData,
      { role: 'user', content: prompt }
    ]

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey.trim()}`,
        'HTTP-Referer': 'https://aegis.socialbrand1980.com',
        'X-Title': 'AEGIS POS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'tencent/hy3-preview:free', messages, stream: true })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `AI Error: ${errorText}` }, { status: response.status })
    }

    const decoder = new TextDecoder()
    let fullContent = ''
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
              fullContent += data.choices[0]?.delta?.content || ''
            } catch { /* ignore */ }
          }
        }
        controller.enqueue(chunk)
      },
      async flush() {
        if (fullContent.trim()) {
          await Promise.all([
            supabaseAdmin.from('ai_messages').insert([{ conversation_id: convId, role: 'assistant', content: fullContent.trim() }]),
            supabaseAdmin.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
          ])
        }
      }
    })

    // Return conversationId in header so frontend can store it
    return new Response(response.body?.pipeThrough(transformStream), {
      headers: new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Conversation-Id': convId
      })
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}

// Warm cache endpoint — called on page load
export async function GET(request: Request) {
  const ctx = await getBusinessContextFromRequest(request)
  if (!ctx) return unauthorizedResponse()
  await fetchBusinessContext(ctx.businessId)
  return NextResponse.json({ ok: true })
}

async function loadHistory(conversationId: string, prompt: string) {
  const { data: past } = await supabaseAdmin
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  supabaseAdmin.from('ai_messages').insert([{ conversation_id: conversationId, role: 'user', content: prompt }]).then()

  return (past || []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}

async function fetchBusinessContext(businessId: string): Promise<string> {
  const cached = contextCache.get(businessId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearAgo = new Date(now); yearAgo.setFullYear(now.getFullYear() - 1)

  const [
    productsRes, membersRes, recentOrdersRes,
    allOrdersRes, yearOrdersRes,
    statsToday, statsWeek, statsMonth
  ] = await Promise.all([
    supabaseAdmin.from('products').select('id, name, price, stock, category, hpp').eq('business_id', businessId).order('name'),
    supabaseAdmin.from('members').select('id, name, phone, points, total_purchases').eq('business_id', businessId).order('total_purchases', { ascending: false }).limit(100),
    supabaseAdmin.from('orders').select('id, total, created_at, payment_method, member:members(name), order_items(qty, product:products(name))').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabaseAdmin.from('orders').select('total').eq('business_id', businessId),
    supabaseAdmin.from('orders').select('total, created_at').eq('business_id', businessId).gte('created_at', yearAgo.toISOString()),
    calcStats(businessId, todayStart),
    calcStats(businessId, weekStart),
    calcStats(businessId, monthStart),
  ])

  const products = productsRes.data || []
  const members = membersRes.data || []
  const orders = recentOrdersRes.data || []
  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`
  const fmtS = (s: { count: number; revenue: number; profit: number }) =>
    `${s.count} order | ${fmt(s.revenue)} revenue | ${fmt(s.profit)} profit`

  // All-time totals
  const allOrders = allOrdersRes.data || []
  const allTimeRevenue = allOrders.reduce((s, o) => s + Number(o.total), 0)
  const allTimeCount = allOrders.length

  // Monthly breakdown last 12 months
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const monthlyMap = new Map<string, { count: number; revenue: number }>()
  for (const o of (yearOrdersRes.data || [])) {
    const d = new Date(o.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const ex = monthlyMap.get(key) || { count: 0, revenue: 0 }
    monthlyMap.set(key, { count: ex.count + 1, revenue: ex.revenue + Number(o.total) })
  }
  const monthlyStr = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, s]) => {
      const [yr, mo] = key.split('-')
      return `${monthNames[parseInt(mo) - 1]} ${yr}: ${s.count} order | ${fmt(s.revenue)}`
    }).join('\n') || 'Belum ada data'

  const result = [
    `[FINANSIAL]
All time: ${allTimeCount} order | ${fmt(allTimeRevenue)} total revenue
Hari ini: ${fmtS(statsToday)}
7 hari terakhir: ${fmtS(statsWeek)}
Bulan ini: ${fmtS(statsMonth)}

[BULANAN 12 BULAN TERAKHIR]
${monthlyStr}`,

    `[PRODUK — ${products.length} item]
${products.map(p => `- id:${p.id} | ${p.name} | Harga:${fmt(p.price)} | HPP:${fmt(p.hpp || 0)} | Stok:${p.stock} | Kategori:${p.category}`).join('\n') || 'Kosong'}`,

    `[MEMBER — ${members.length} orang, top by pembelian]
${members.map(m => `- id:${m.id} | ${m.name} | ${m.phone} | Poin:${m.points} | Total belanja:${fmt(m.total_purchases)}`).join('\n') || 'Belum ada'}`,

    `[SEMUA TRANSAKSI (${orders.length} total, terbaru di atas)]
${orders.map(o => {
  const d = new Date(o.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  const buyer = (o.member as unknown as { name: string } | null)?.name || 'Umum'
  type OI = { qty: number; product: unknown }
  const items = (o.order_items as OI[] | null)?.map(i => `${i.qty}x ${(i.product as { name: string } | null)?.name}`).join(', ') || '-'
  return `[${d}] ${buyer} | ${items} | ${fmt(Number(o.total))} | ${o.payment_method}`
}).join('\n') || 'Belum ada'}`
  ].join('\n\n')

  contextCache.set(businessId, { data: result, ts: Date.now() })
  return result
}

async function calcStats(businessId: string, from: Date) {
  const { data: orderIds } = await supabaseAdmin.from('orders').select('id, total').eq('business_id', businessId).gte('created_at', from.toISOString())
  if (!orderIds?.length) return { count: 0, revenue: 0, profit: 0 }
  const revenue = orderIds.reduce((s, o) => s + Number(o.total), 0)
  const { data: items } = await supabaseAdmin.from('order_items').select('cost_price, qty').in('order_id', orderIds.map(o => o.id))
  const cost = (items || []).reduce((s, i) => s + Number(i.cost_price || 0) * i.qty, 0)
  return { count: orderIds.length, revenue, profit: revenue - cost }
}

function buildSystemPrompt(context: string): string {
  return `Kamu adalah Aegis — AI business advisor di AEGIS POS.

## Kepribadian
Santai, cerdas, to the point. Bahasa Indonesia. Jangan perkenalkan diri. Jangan sebut nama kamu kecuali ditanya.

## Aturan Jawaban

**Pertanyaan singkat** (harga produk, jumlah member, dsb) → jawab 1-2 kalimat, bold angka pentingnya. Tidak perlu tabel.

**Pertanyaan data/analisis** → WAJIB visual. Jangan pernah dump angka polos dalam paragraf.

## Kapan Pakai Format Visual (WAJIB)

| Situasi | Format |
|---|---|
| Data keuangan (revenue, profit, perbandingan periode) | TABLE + CHART |
| Tren waktu (bulanan, mingguan) | CHART type="bar" atau "line" |
| Ranking produk / member | TABLE |
| Perbandingan 2+ item | TABLE |
| Komposisi/proporsi | CHART type="pie" |
| List produk dengan harga/stok | TABLE |
| Analisis profit margin | TABLE |

## Format Output

### Teks
Gunakan markdown dengan benar:
- \`## Judul Bagian\` untuk section
- \`**angka penting**\` untuk highlight nilai kunci
- Bullet list untuk insight/rekomendasi
- Jangan tulis paragraf panjang tanpa struktur

### Chart
\`\`\`
[CHART type="bar"]{"title":"Judul","data":[{"name":"Jan","value":1000000}],"keys":["value"],"colors":["#6366f1"]}[/CHART]
\`\`\`
- type: "bar" | "line" | "pie" | "area"
- data.name: label sumbu X atau slice
- keys: array nama field nilai (bisa multiple: ["revenue","profit"])
- colors: array hex, satu per key

### Tabel
\`\`\`
[TABLE]{"headers":["Kolom A","Kolom B"],"rows":[["nilai1","nilai2"]]}[/TABLE]
\`\`\`

### Aksi Data
\`\`\`
[ACTION]{"type":"nama_aksi","payload":{...}}[/ACTION]
\`\`\`
Tipe: update_product, update_stock, delete_product, update_member, delete_member, update_settings

## Contoh Jawaban Bagus

**User: "Revenue bulan ini berapa?"**
## Revenue Bulan Ini
**Rp 12.500.000** dari **47 transaksi**

[TABLE]{"headers":["Metrik","Nilai"],"rows":[["Revenue","Rp 12.500.000"],["Profit","Rp 4.200.000"],["Margin","33,6%"],["Rata-rata per transaksi","Rp 265.957"]]}[/TABLE]

---

**User: "Tunjukkan tren penjualan 3 bulan terakhir"**
## Tren Penjualan

[CHART type="bar"]{"title":"Revenue 3 Bulan Terakhir","data":[{"name":"Feb","value":9800000},{"name":"Mar","value":11200000},{"name":"Apr","value":12500000}],"keys":["value"],"colors":["#6366f1"]}[/CHART]

📈 Tren **positif** — naik **27,6%** dalam 3 bulan.

---

**User: "Produk terlaris?"**
## Top 5 Produk Terlaris

[TABLE]{"headers":["#","Produk","Kategori","Terjual","Revenue"],"rows":[["1","Kopi Susu","Minuman","124","Rp 1.860.000"],["2","Roti Bakar","Makanan","98","Rp 980.000"]]}[/TABLE]

## Aturan Tambahan
- Kalau data tidak ada → bilang jujur, sarankan cek menu Transactions
- Selalu hitung dari data yang tersedia, jangan bilang tidak bisa kalau datanya ada
- Format angka rupiah: \`Rp X.XXX.XXX\` (pakai titik, bukan koma)
- Persentase: sertakan konteks (naik/turun dari apa)

## DATA BISNIS SAAT INI
${context}`
}
