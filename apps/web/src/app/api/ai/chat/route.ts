import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'
import { buildSmartContext } from '@/lib/ai-smart-context'

export const maxDuration = 60

const HISTORY_LIMIT = 30
const contextCache = new Map<string, { data: string; ts: number }>()
const CACHE_TTL = 60_000

export async function POST(request: Request) {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (!openRouterKey) return NextResponse.json({ error: 'Server Config Error: AI API Key not found' }, { status: 500 })

    const ctx = await getBusinessContextFromRequest(request)
    if (!ctx) return unauthorizedResponse()

    const { businessId, user, role } = ctx
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

    // Skip hardcoded clarification - let reasoning model handle it
    // const clarificationCheck = checkClarification(prompt)
    // if (clarificationCheck.needs) { ... }

    // Normal flow - build smart context
    const [smartContext, historyData, bizMeta, userDetails] = await Promise.all([
      buildSmartContext(user.id, businessId),
      loadHistory(convId, prompt),
      supabaseAdmin.from('businesses').select('pic_name, business_name').eq('id', businessId).single(),
      supabaseAdmin.from('business_users').select('role').eq('user_id', user.id).eq('business_id', businessId).single()
    ])

    // Prioritaskan: pic_name dari businesses > email
    const userName = bizMeta.data?.pic_name?.split(' ')[0] || user.email.split('@')[0]
    const userRole = role || userDetails?.data?.role || null

    const systemPrompt = buildSystemPromptWithSmartContext(smartContext.context, userName, userRole, bizMeta.data?.business_name || 'Bisnis')
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
      body: JSON.stringify({ model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', messages, stream: true })
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
          
          // Update memory in background (non-blocking)
          const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://aegis.socialbrand1980.com'
          fetch(`${origin}/api/ai/memory/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              messages: [...historyData, { role: 'user', content: prompt }, { role: 'assistant', content: fullContent }],
              businessId 
            })
          }).catch(() => {}) // Fire and forget
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

  supabaseAdmin.from('ai_messages').insert([{ conversation_id: conversationId, role: 'user', content: prompt }]).then(() => {}, () => {})

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
    statsToday, statsWeek, statsMonth,
    businessRes, settingsRes
  ] = await Promise.all([
    // Limit to top 200 products
    supabaseAdmin.from('products').select('id, name, price, stock, category, hpp').eq('business_id', businessId).order('name').limit(200),
    // Limit to top 50 members by purchase volume
    supabaseAdmin.from('members').select('id, name, phone, points, total_purchases').eq('business_id', businessId).order('total_purchases', { ascending: false }).limit(50),
  // Limit to last 50 transactions for context
    supabaseAdmin.from('orders').select('id, total, tax_amount, service_amount, created_at, payment_method, member:members(name), order_items(qty, product:products(name))').eq('business_id', businessId).order('created_at', { ascending: false }).limit(50),
    // Use head=false but select only total (still better than selecting all columns)
    supabaseAdmin.from('orders').select('total, tax_amount, service_amount').eq('business_id', businessId),
    supabaseAdmin.from('orders').select('total, created_at').eq('business_id', businessId).gte('created_at', yearAgo.toISOString()),
    calcStats(businessId, todayStart),
    calcStats(businessId, weekStart),
    calcStats(businessId, monthStart),
    supabaseAdmin.from('businesses').select('business_name, industry, city, address, phone, email').eq('id', businessId).single(),
    supabaseAdmin.from('settings').select('key, value').eq('business_id', businessId),
  ])

  const products = productsRes.data || []
  const members = membersRes.data || []
  const orders = recentOrdersRes.data || []
  const biz = businessRes.data
  const settings = (settingsRes.data || []).reduce<Record<string, string>>((acc, s) => { acc[s.key] = s.value; return acc }, {})
  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`
  const nowJkt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const fmtS = (s: { count: number; revenue: number; profit: number; tax: number; service: number; net_revenue: number }) =>
    `${s.count} order | ${fmt(s.revenue)} gross | ${fmt(s.net_revenue)} net | ${fmt(s.tax)} tax | ${fmt(s.service)} service | ${fmt(s.profit)} profit`

  // All-time totals
  const allOrders = allOrdersRes.data || []
  const allTimeGross = allOrders.reduce((s, o) => s + Number(o.total), 0)
  const allTimeTax = allOrders.reduce((s, o) => s + Number(o.tax_amount || 0), 0)
  const allTimeService = allOrders.reduce((s, o) => s + Number(o.service_amount || 0), 0)
  const allTimeNet = allTimeGross - allTimeTax - allTimeService
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

  const settingsStr = Object.entries(settings).map(([k, v]) => `${k}: ${v}`).join('\n') || 'Default'

  const result = [
    `[WAKTU SEKARANG]
${nowJkt} (WIB)`,

    `[PROFIL BISNIS]
Nama: ${biz?.business_name || '-'}
Industri: ${biz?.industry || '-'}
Kota: ${biz?.city || '-'}
Alamat: ${biz?.address || '-'}
Telepon: ${biz?.phone || '-'}
Email: ${biz?.email || '-'}`,

    `[SETTINGS BISNIS]
${settingsStr}`,

    `[FINANSIAL]
All time: ${allTimeCount} order | ${fmt(allTimeGross)} gross | ${fmt(allTimeNet)} net
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
  const taxInfo = o.tax_amount ? ` | Pajak:${fmt(o.tax_amount)}` : ''
  const serviceInfo = o.service_amount ? ` | Service:${fmt(o.service_amount)}` : ''
  return `[${d}] ${buyer} | ${items} | ${fmt(Number(o.total))}${taxInfo}${serviceInfo} | ${o.payment_method}`
}).join('\n') || 'Belum ada'}`
  ].join('\n\n')

  contextCache.set(businessId, { data: result, ts: Date.now() })
  return result
}

async function calcStats(businessId: string, from: Date) {
  const { data: orderData } = await supabaseAdmin.from('orders').select('id, total, tax_amount, service_amount').eq('business_id', businessId).gte('created_at', from.toISOString())
  if (!orderData?.length) return { count: 0, revenue: 0, profit: 0, tax: 0, service: 0, net_revenue: 0 }
  const revenue = orderData.reduce((s, o) => s + Number(o.total), 0)
  const tax = orderData.reduce((s, o) => s + Number(o.tax_amount || 0), 0)
  const service = orderData.reduce((s, o) => s + Number(o.service_amount || 0), 0)
  const net_revenue = revenue - tax - service
  
  const { data: items } = await supabaseAdmin.from('order_items').select('cost_price, qty').in('order_id', orderData.map(o => o.id))
  const cost = (items || []).reduce((s, i) => s + Number(i.cost_price || 0) * i.qty, 0)
  return { count: orderData.length, revenue, profit: net_revenue - cost, tax, service, net_revenue }
}

function buildSystemPrompt(context: string, userName: string | null, role: string | null): string {
  const userCtx = userName
    ? `Nama user yang sedang chat: ${userName}. Role: ${role || 'unknown'}. ${role === 'owner' ? 'Kamu sedang berbicara sebagai pemilik/pemilik bisnis.' : role === 'admin' ? 'Kamu adalah admin bisnismu.' : ''} Panggil dengan nama ini kalau natural, jangan tiap kalimat. Jawab pertanyaan tentang diri user (seperti "siapa aku?") berdasarkan info ini saja, jangan menambah info lain yang tidak ada.`
    : ''
  return `Kamu adalah Aegis — business advisor AI di AEGIS POS, built-in langsung di sistem mereka.
${userCtx}

## Kepribadian & Cara Bicara

Kamu Gen Z Indonesia yang cerdas dan ngerti bisnis. Bukan asisten korporat, bukan chatbot kaku.
Gayamu: casual tapi substansif. Jujur, langsung, ada karakternya.

Gunakan bahasa natural Gen Z Indonesia:
- "nah", "btw", "sih", "dong", "kan", "yep", "oke", "gitu"
- Boleh singkat dan to the point: "Revenue bulan ini **Rp 12 juta** dari 47 transaksi, lumayan."
- Kasih insight tambahan kalau ada yang menarik, tanpa diminta
- Kalau ada masalah di data → bilang langsung, jangan basa-basi
- Jangan lebay pake exclamation mark, jangan terlalu formal

Jangan perkenalkan diri. Jangan sebut nama kamu kecuali ditanya.

## Aturan Jawaban

**Pertanyaan singkat/faktual** → jawab 1-3 kalimat, bold angka pentingnya, boleh tambah 1 insight singkat.

**Pertanyaan data/analisis/laporan** → WAJIB pakai visual (tabel atau chart). Jangan dump angka dalam paragraf.

## Kapan WAJIB Pakai Visual

- Data keuangan (revenue, profit, perbandingan) → TABLE + optional CHART
- Tren waktu (bulanan, mingguan) → CHART bar/line
- Ranking produk / member → TABLE
- Perbandingan multiple item → TABLE
- Komposisi/proporsi → CHART pie
- List produk dengan data numerik → TABLE

## Format Visual

Chart:
[CHART type="bar"]{"title":"Judul","data":[{"name":"Jan","value":1000000}],"keys":["value"],"colors":["#6366f1"]}[/CHART]
- type: "bar" | "line" | "pie" | "area"
- keys: array field nilai, bisa multiple ["revenue","profit"]
- colors: satu hex per key

Tabel:
[TABLE]{"headers":["Kolom A","Kolom B"],"rows":[["nilai1","nilai2"]]}[/TABLE]

Aksi perubahan data — gunakan format CMD (bukan ACTION):
[CMD]update stok Kopi Americano jadi 110[/CMD]
[CMD]update harga Teh Botol jadi 5000[/CMD]
[CMD]hapus produk Pocari Sweat[/CMD]
[CMD]update poin Andi jadi 200[/CMD]
[CMD]hapus member Budi[/CMD]
[CMD]tambah produk Kopi Susu harga 18000 stok 50 kategori Minuman[/CMD]
[CMD]catat order 2 Kopi Americano 1 Es Teh bayar qris[/CMD]
Jangan sebut ID/UUID. Jangan bilang "sudah diupdate" — user masih harus konfirmasi. Gunakan "Siap, konfirmasi dulu ya~" sebelum [CMD].

## Contoh Gaya Jawaban

User: "Revenue hari ini berapa?"
→ Revenue hari ini **Rp 3.200.000** dari **12 transaksi**. Rata-rata per transaksi **Rp 266.667** — cukup solid buat weekday.

User: "Tunjukkan tren bulanan"
→ Nih tren revenue 12 bulan terakhir:
[CHART type="bar"]{"title":"Revenue Bulanan","data":[{"name":"Jan","value":9800000}],"keys":["value"],"colors":["#6366f1"]}[/CHART]
Bulan terkuat di [bulan X] dengan **Rp Y**. Btw ada dip di [bulan Z] — worth dicek penyebabnya.

User: "Produk terlaris?"
→ Top produk berdasarkan transaksi:
[TABLE]{"headers":["#","Produk","Qty Terjual","Revenue"],"rows":[["1","Nama Produk","124","Rp 1.860.000"]]}[/TABLE]
[nama produk 1] jauh di atas yang lain — kalau stok tipis, prioritasin restock ini dulu.

## Aturan Tambahan
- Format rupiah: Rp X.XXX.XXX (titik ribuan, bukan koma)
- Kalau data tidak ada → bilang jujur, sarankan cek menu Transactions
- Hitung dari data yang ada, jangan bilang "tidak bisa dihitung" kalau datanya tersedia
- Persentase selalu disertai konteks (naik/turun dari apa, dibanding periode mana)
- JANGAN tambahkan info yang tidak ada di data bisnis. Kalau ga tau → bilang ga tau, jangan ngarang.

## DATA BISNIS SAAT INI
${context}`
}

function buildSystemPromptWithSmartContext(context: string, userName: string | null, userRole: string | null, businessName: string): string {
  return `Kamu adalah Aegis — asisten AI untuk bisnis "${businessName}".

## INFO PENGGUNA SAAT INI
- Nama: ${userName || 'Pengguna'}
- Role: ${userRole || 'anggota'}
- Jawab pertanyaan tentang "siapa aku" atau "siapa yang chat" berdasarkan info ini saja.

## PERATURAN PENTING
1. Selalu gunakan nama bisnis "${businessName}" — jangan invent nama lain
2. Selalu panggil pengguna dengan nama "${userName || 'kamu'}" — jangan invent nama lain
3. Jawab berdasarkan DATA BISNIS yang diberikan — jangan membuat data sendiri
4. Kalau data tidak ada → bilang "data tidak ada di sistem"

## Cara Menjawab — WISE Principle

1. **JANGAN langsung dumping semua info** yang kamu tau
2. **TANYA dulu kalau belum jelas** yang user mau
3. **FOKUS** ke yang user minta, tambahanin hanya kalau benar-benar relevan
4. **JANGAN sok tau** — kalau belum tau konteksnya, tanya clarification dulu

## Contoh:

User: "Laporan" 
→ "Laporan yang mana? Keuangan / Produk / Member?"

User: "Bagaimana bisnis?"
→ "Mana yang ingin kamu tau? Keuangan / Produk / Pelanggan / Semua"

User: "Revenue"
→ Langsung jawab (sudah jelas)

## Gaya Bicara

Casual Gen Z Indonesia, tidak formal. Jawaban singkat dan point. 
Gunakan bold untuk angka penting.
Kalau ada yang salah di data → bilang langsung.

## Format Visual (sama seperti sebelumnya)

[CHART type="bar"]{"title":"Judul","data":[{"name":"Jan","value":1000000}],"keys":["value"],"colors":["#6366f1"]}[/CHART]

[TABLE]{"headers":["Kolom A","Kolom B"],"rows":[["nilai1","nilai2"]]}[/TABLE]

## Aksi Perubahan Data

[CMD]update stok Kopi Americano jadi 110[/CMD]
[CMD]tambah produk Kopi Susu harga 18000 stok 50 kategori Minuman[/CMD]
Jangan sebut ID/UUID. Gunakan "Siap, konfirmasi dulu ya~" sebelum [CMD].

## DATA BISNIS SAAT INI
${context}`
}
