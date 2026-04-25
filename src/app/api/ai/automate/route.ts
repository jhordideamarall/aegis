import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'

const SYSTEM_PROMPT = `Kamu adalah intent classifier untuk aplikasi POS. Tugas satu-satunya: classify intent user.
Return ONLY valid JSON, tanpa markdown, tanpa komentar, tanpa penjelasan apapun.

Format: {"intent":"<nama>","params":{...}}
Jika tidak ada intent yang cocok: {"intent":"unknown"}

AVAILABLE INTENTS & CONTOH NATURAL LANGUAGE:

update_stock {product_name, stock}
- "update stok pocari jadi 50"
- "stok kopi americano tinggal 5"
- "tambahin stok teh 100"
- "set stok mie goreng ke 20"

update_price {product_name, price}
- "ubah harga pocari jadi 8000"
- "harga kopi americano sekarang 15000"
- "ganti harga teh botol 5000"

delete_product {product_name}
- "hapus produk pocari"
- "remove kopi americano dari menu"

update_member_points {member_name, points}
- "poin andi sekarang 200"
- "tambah poin budi jadi 150"
- "update poin member siti ke 50"

delete_member {member_name}
- "hapus member andi"
- "remove member budi"

check_revenue {period: "today"|"week"|"month"|"year"|"all"}
- "revenue hari ini berapa?"
- "pendapatan minggu ini"
- "omzet bulan ini"
- "total penjualan tahun ini"
- "revenue semua"

find_product {query}
- "cari produk kopi"
- "info pocari"
- "ada produk teh?"
- "tampilkan semua produk kopi"

find_member {query}
- "cari member andi"
- "info member budi"
- "member dengan nama siti"

low_stock_alert {}
- "produk mana yang stoknya mau habis?"
- "ada produk kosong?"
- "stok menipis"
- "produk yang hampir habis"
- "cek stok rendah"
- "produk stok 0"

update_settings {key, value}
- "aktifkan program poin"
- "matikan pajak"
- "ubah tax rate jadi 10"

needs_context {}
- "analisis penjualan kita"
- "kasih saran untuk bisnis"
- "kenapa revenue turun?"
- "produk mana yang paling laku?"
- "gimana performa bulan ini?"
- "bandingkan produk terlaris"
- "insight bisnis hari ini"
- semua pertanyaan analitik/strategis yang butuh data bisnis nyata

RULES:
- Semua nilai numeric harus number bukan string
- Untuk low_stock_alert tidak perlu params
- Jika ambigu antara find_product dan low_stock_alert, pilih low_stock_alert jika menyebut "kosong", "habis", "menipis", "rendah"
- Jika user menyebut "ini", "itu", "tadi", "yang tadi" → cari nama produk/member dari "Konteks pesan sebelumnya" yang diberikan, gunakan nama itu sebagai product_name atau member_name
- Jika pertanyaan analitik/bisnis yang butuh data real tapi bukan intent di atas: {"intent":"needs_context"}
- Jika pesan casual/umum yang sama sekali tidak butuh data bisnis (salam, obrolan): {"intent":"unknown"}`

export async function POST(request: Request) {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (!openRouterKey) {
    return NextResponse.json({ intent: 'unknown' })
  }

  const businessContext = await getBusinessContextFromRequest(request)
  if (!businessContext) return unauthorizedResponse()

  const body = await request.json().catch(() => ({}))
  const prompt = body?.prompt?.trim()
  if (!prompt) return NextResponse.json({ intent: 'unknown' })

  const lastContext = body?.lastContext?.trim() || ''

  // Build user message — include last assistant context so "ini"/"itu" can be resolved
  const userMessage = lastContext
    ? `Konteks pesan sebelumnya:\n"${lastContext.slice(0, 500)}"\n\nPerintah user: ${prompt}`
    : prompt

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey.trim()}`,
        'HTTP-Referer': 'https://aegis-pos.com',
        'X-Title': 'AEGIS POS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        stream: false,
        max_tokens: 200
      })
    })

    if (!response.ok) return NextResponse.json({ intent: 'unknown' })

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''

    // Strip markdown code blocks if model wraps response
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

    const parsed = JSON.parse(cleaned)
    if (!parsed.intent) return NextResponse.json({ intent: 'unknown' })

    return NextResponse.json({ intent: parsed.intent, params: parsed.params || {} })
  } catch {
    return NextResponse.json({ intent: 'unknown' })
  }
}
