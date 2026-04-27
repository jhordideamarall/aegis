export type FieldDef =
  | { name: string; label: string; placeholder: string; type?: 'text' | 'number' | 'date' }
  | { name: string; label: string; options: string[] }

export interface CommandDef {
  key: string
  icon: string
  label: string
  description: string
  intent: string
  fields: FieldDef[]
}

export interface AutomationState {
  intent: string
  params: Record<string, unknown>
  resolved: { id?: string; name?: string; currentValue?: number | string; [key: string]: unknown }
  multipleMatches?: Array<{ id: string; name: string; [key: string]: unknown }>
  isBulk?: boolean
  bulkItems?: Array<{ id: string; name: string; [key: string]: unknown }>
}

export const COMMANDS: CommandDef[] = [
  {
    key: 'stok', icon: '', label: 'Update Stok', description: 'Ubah jumlah stok produk',
    intent: 'update_stock',
    fields: [
      { name: 'product_name', label: 'Nama produk', placeholder: 'Pocari Sweat' },
      { name: 'stock', label: 'Stok baru', placeholder: '50', type: 'number' },
    ]
  },
  {
    key: 'harga', icon: '', label: 'Update Harga', description: 'Ubah harga jual produk',
    intent: 'update_price',
    fields: [
      { name: 'product_name', label: 'Nama produk', placeholder: 'Kopi Americano' },
      { name: 'price', label: 'Harga baru (Rp)', placeholder: '15000', type: 'number' },
    ]
  },
  {
    key: 'poin', icon: '', label: 'Update Poin Member', description: 'Set poin member',
    intent: 'update_member_points',
    fields: [
      { name: 'member_name', label: 'Nama member', placeholder: 'Andi' },
      { name: 'points', label: 'Poin baru', placeholder: '100', type: 'number' },
    ]
  },
  {
    key: 'revenue', icon: '', label: 'Cek Revenue', description: 'Lihat pendapatan per periode',
    intent: 'check_revenue',
    fields: [
      { name: 'period', label: 'Periode', options: ['Hari ini', 'Minggu ini', 'Bulan ini', 'Tahun ini', 'All time'] },
    ]
  },
  {
    key: 'produk', icon: '', label: 'Cari Produk', description: 'Cari info produk',
    intent: 'find_product',
    fields: [{ name: 'query', label: 'Nama produk', placeholder: 'Ketik nama...' }]
  },
  {
    key: 'member', icon: '', label: 'Cari Member', description: 'Cari info member',
    intent: 'find_member',
    fields: [{ name: 'query', label: 'Nama / no HP', placeholder: 'Ketik nama...' }]
  },
  {
    key: 'stokmin', icon: '', label: 'Stok Menipis', description: 'Lihat produk stok hampir habis',
    intent: 'low_stock_alert',
    fields: []
  },
  {
    key: 'restock', icon: '', label: 'Prediksi Restock', description: 'Produk yang akan habis berdasarkan penjualan',
    intent: 'predictive_restock',
    fields: []
  },
  {
    key: 'tambah-produk', icon: '', label: 'Tambah Produk', description: 'Daftarkan produk baru',
    intent: 'create_product',
    fields: [
      { name: 'name', label: 'Nama produk', placeholder: 'Kopi Susu' },
      { name: 'price', label: 'Harga jual (Rp)', placeholder: '18000', type: 'number' as const },
      { name: 'stock', label: 'Stok awal', placeholder: '50', type: 'number' as const },
      { name: 'category', label: 'Kategori (opsional)', placeholder: 'Minuman' },
    ]
  },
  {
    key: 'export', icon: '', label: 'Export Report', description: 'Generate sales report (PDF)',
    intent: 'export_report',
    fields: [
      { name: 'period', label: 'Time Range', options: ['Today', 'This Week', 'This Month', 'Last Month', 'This Year', 'Custom'] },
      { name: 'startDate', label: 'Start Date', placeholder: 'YYYY-MM-DD', type: 'date' },
      { name: 'endDate', label: 'End Date', placeholder: 'YYYY-MM-DD', type: 'date' },
    ]
  },
  {
    key: 'order', icon: '', label: 'Catat Order', description: 'Buat transaksi langsung dari chat',
    intent: 'create_order',
    fields: []
  },
  {
    key: 'hapus-produk', icon: '', label: 'Hapus Produk', description: 'Hapus produk dari sistem',
    intent: 'delete_product',
    fields: [{ name: 'product_name', label: 'Nama produk', placeholder: 'Pocari Sweat' }]
  },
  {
    key: 'hapus-member', icon: '', label: 'Hapus Member', description: 'Hapus member dari sistem',
    intent: 'delete_member',
    fields: [{ name: 'member_name', label: 'Nama member', placeholder: 'Andi' }]
  },
]

export const ALL_KEYWORDS = new Set(['semua', 'all', 'seluruh', 'daftar', 'list', 'semua produk', 'semua member', 'all member'])

export function fmt(n: number) { return `Rp${n.toLocaleString('id-ID')}` }

export function intentToActionType(intent: string): string {
  return ({
    update_stock: 'update_stock',
    update_price: 'update_product',
    delete_product: 'delete_product',
    update_member_points: 'update_member',
    delete_member: 'delete_member',
    update_settings: 'update_settings',
  } as Record<string, string>)[intent] || intent
}

export function buildActionPayload(a: AutomationState): Record<string, unknown> {
  switch (a.intent) {
    case 'update_stock':         return { id: a.resolved.id, stock: Number(a.params.stock) }
    case 'update_price':         return { id: a.resolved.id, price: Number(a.params.price) }
    case 'delete_product':       return { id: a.resolved.id, name: a.resolved.name }
    case 'update_member_points': return { id: a.resolved.id, points: Number(a.params.points) }
    case 'delete_member':        return { id: a.resolved.id, name: a.resolved.name }
    case 'update_settings':      return { key: a.params.key, value: a.params.value }
    default: return {}
  }
}

export function parseIDNumber(s: string): string {
  return s
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)\b/gi, (_, n) => String(Math.round(parseFloat(n.replace(',', '.')) * 1000)))
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta|m)\b/gi, (_, n) => String(Math.round(parseFloat(n.replace(',', '.')) * 1_000_000)))
}

export function resolvePronoun(input: string, lastMsg: string): string {
  if (!lastMsg || !/\b(ini|itu|tadi|yang tadi)\b/i.test(input)) return input
  const patterns = [
    /[-•]\s*([A-Za-z0-9 _\-']+?):\s*\d+\s*sisa/,
    /\*\*([A-Za-z0-9 _\-']+?)\*\*/,
    /`([A-Za-z0-9 _\-']+?)`/,
    /id:[a-f0-9-]+\s*\|\s*([^|]+?)\s*\|/,
  ]
  for (const pattern of patterns) {
    const m = lastMsg.match(pattern)
    const name = m?.[1]?.trim()
    if (name && name.length > 1) return input.replace(/\b(ini|itu|tadi|yang tadi)\b/gi, name)
  }
  return input
}

export function detectLocalIntent(input: string): { intent: string; params: Record<string, unknown> } | null {
  const s = parseIDNumber(input.trim())

  // ── Verbs & separators ─────────────────────────────────────────────────────
  const updateVerb = /(?:update|updat|ubah|rubah|ganti|gnt|set|jadiin?|tambahin?|tmbh|tmbah|kurangi?|coba(?:in)?|bikin?|bkn|kasih|pasang|pake|naikin?|turunin?|revisi|edit|atur|setel)/i
  const valueSep   = /(?:jadi(?:in)?|ke|k|=|menjadi|mnjd|mjd|:\s*|adi|jd|jdi|sebesar|senilai)/i
  const stockWord  = /(?:stok|stock|stc|stk|persediaan|inventory|sisa|barangnya?|brg|jml|jumlah)/i
  const priceWord  = /(?:harga|price|haga|hrg|hrga|bandrol|banderol|rp)/i
  const pointWord  = /(?:poin|point|points?|pn|pnt|reward|rwd|kredit)/i

  let m: RegExpMatchArray | null

  // ── Stock update ────────────────────────────────────────────────────────────
  if (stockWord.test(s)) {
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${stockWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(/(.+?)\s+(?:stoknya|stocknya|sisanya)\s+(?:jadi|ke|=|menjadi|sekarang|skrg)?\s*(\d+)/i)
      || s.match(/(.+?)\s+tinggal\s+(\d+)\s*(?:pcs|buah|unit|biji|kg|liter)?/i)
      || s.match(/(?:isi|restok|restock)\s+(.+?)\s+(?:jadi|ke|=|menjadi|dengan|dg|dgn)?\s*(\d+)/i)
    if (m) return { intent: 'update_stock', params: { product_name: m[1].trim(), stock: Number(m[2]) } }
  }

  // ── Price update ────────────────────────────────────────────────────────────
  if (priceWord.test(s)) {
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${priceWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(/(.+?)\s+(?:harganya|pricenya|harga\s+barunya)\s+(?:jadi|ke|=|menjadi|sekarang)?\s*(\d+)/i)
      || s.match(/(.+?)\s+(?:dijual|jualnya|dijualnya)\s+(?:seharga|dengan harga|harga)?\s*(\d+)/i)
    if (m && priceWord.test(s)) return { intent: 'update_price', params: { product_name: m[1].trim(), price: Number(m[2]) } }
  }

  // ── Points update ───────────────────────────────────────────────────────────
  if (pointWord.test(s)) {
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${pointWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(/(.+?)\s+(?:poinnya|pointnya|rewardnya)\s+(?:jadi|ke|=|menjadi)?\s*(\d+)/i)
    if (m) return { intent: 'update_member_points', params: { member_name: m[1].trim(), points: Number(m[2]) } }
  }

  // ── Revenue check ───────────────────────────────────────────────────────────
  m = s.match(/(?:cek|lihat|liat|lht|tampilkan?|berapa|gimana|bagaimana|check)\s+(?:revenue|rvn|pendapatan|dapetnya|omset|omzet|penghasilan|penjualan|jual|sales)(?:\s+(.+))?/i)
  if (m) {
    const periodRaw = (m[1] || 'today').trim().toLowerCase()
    const periodMap: Record<string, string> = { 'hari ini': 'today', 'today': 'today', 'minggu ini': 'week', 'minggu': 'week', 'bulan ini': 'month', 'bulan': 'month', 'tahun ini': 'year', 'tahun': 'year', 'all': 'all', 'semua': 'all' }
    const period = periodMap[periodRaw] || 'today'
    return { intent: 'check_revenue', params: { period } }
  }

  // ── Low stock alert ─────────────────────────────────────────────────────────
  if (/(?:stok\s+(?:menipis|nipis|hampir\s+habis|hbis|kritis|krts|dikit|dkt|sedikit|rendah)|produk\s+(?:mau\s+habis|abis|hampir\s+abis))/i.test(s)) {
    return { intent: 'low_stock_alert', params: {} }
  }

  // ── Delete member ───────────────────────────────────────────────────────────
  m = s.match(/(?:hapus|hps|apus|delete|dlt|remove|rmv|buang|ilangin?|ilng|keluarin?|kick)\s+(?:data\s+)?(?:member|pelanggan|customer|cust|user)\s+(.+)/i)
  if (m) return { intent: 'delete_member', params: { member_name: m[1].trim() } }

  // ── Delete product ──────────────────────────────────────────────────────────
  m = s.match(/(?:hapus|hps|apus|delete|dlt|remove|rmv|buang|ilangin?|ilng|nonaktifkan?)\s+(?:produk|product|item|barang|brg\s+)?(.+)/i)
  if (m && !s.match(/\b(?:member|pelanggan|customer|cust|user)\b/i)) return { intent: 'delete_product', params: { product_name: m[1].trim() } }

  // ── Find product ────────────────────────────────────────────────────────────
  m = s.match(/(?:cari|search|cek|lihat|liat|lht|info|detail)\s+(?:produk|product|barang|brg|item)\s+(.+)/i)
  if (m) return { intent: 'find_product', params: { query: m[1].trim() } }

  // ── Find member ─────────────────────────────────────────────────────────────
  m = s.match(/(?:cari|search|cek|lihat|liat|lht|info|detail)\s+(?:member|pelanggan|customer|cust|user)\s+(.+)/i)
  if (m) return { intent: 'find_member', params: { query: m[1].trim() } }

  // ── Create product ──────────────────────────────────────────────────────────
  // "tambah/buat/daftar produk NAME harga PRICE stok STOCK kategori CAT"
  m = s.match(/(?:tambah|tmbh|tmbah|buat|bikin|bkn|daftarkan?|dftr|input|add|masukin?|masukkan?|register)\s+(?:produk|product|barang|brg|item\s+)?(.+?)\s+(?:harga|price|haga|hrg|hrga)\s+(\d+)(?:\s+(?:stok|stock|stk|stc|jml)\s+(\d+))?(?:\s+(?:kategori|category|cat)\s+(.+))?$/i)
  if (m) return {
    intent: 'create_product',
    params: { name: m[1].trim(), price: Number(m[2]), stock: Number(m[3] || 0), category: (m[4] || '').trim() }
  }

  // ── Create order ─────────────────────────────────────────────────────────────
  // "catat/buat order QTY PRODUCT ... bayar METHOD"
  m = s.match(/(?:catat|ctt|buat|bikin|bkn|create|input|pesan|psn|psan|order|ordr)\s+(?:order|transaksi|trans|pembelian\s+)?(.+?)\s+(?:bayar|byr|byrn|payment|dibayar|via|pakai|pakek|dengan|dgn|pembayaran)\s+(\S+)/i)
  if (m) {
    const itemsStr = m[1].trim()
    const paymentMethod = m[2].toLowerCase()
    const itemMatches = [...itemsStr.matchAll(/(\d+)\s+([A-Za-z][^0-9]+?)(?=\d|$)/g)]
    if (itemMatches.length > 0) {
      const items = itemMatches.map(im => ({ product_name: im[2].trim(), qty: Number(im[1]) }))
      return { intent: 'create_order', params: { items, payment_method: paymentMethod } }
    }
  }

  return null
}
