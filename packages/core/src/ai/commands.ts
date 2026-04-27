export type FieldDef =
  | { name: string; label: string; placeholder: string; type?: 'text' | 'number' }
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
  const updateVerb = /(?:update|ubah|ganti|set|jadiin?|tambahin?|kurangi?|coba(?:in)?|bikin?|kasih|pasang|pake)/i
  const valueSep = /(?:jadi(?:in)?|ke|=|menjadi|:\s*|adi|jd)/i
  const stockWord = /(?:stok|stock)/i
  const priceWord = /(?:harga|price)/i
  const pointWord = /(?:poin|points?)/i

  let m: RegExpMatchArray | null

  if (stockWord.test(s)) {
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${stockWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(/(.+?)\s+(?:stoknya|stocknya)\s+(?:jadi|ke|=|menjadi)?\s*(\d+)/i)
      || s.match(/(.+?)\s+tinggal\s+(\d+)/i)
    if (m) return { intent: 'update_stock', params: { product_name: m[1].trim(), stock: Number(m[2]) } }
  }

  if (priceWord.test(s)) {
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${priceWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
      || s.match(/(.+?)\s+(?:harganya|pricenya)\s+(?:jadi|ke|=|menjadi)?\s*(\d+)/i)
    if (m) return { intent: 'update_price', params: { product_name: m[1].trim(), price: Number(m[2]) } }
  }

  if (pointWord.test(s)) {
    m = s.match(new RegExp(`(?:${updateVerb.source}\\s+)?${pointWord.source}\\s+(.+?)\\s+${valueSep.source}\\s*(\\d+)`, 'i'))
    if (m) return { intent: 'update_member_points', params: { member_name: m[1].trim(), points: Number(m[2]) } }
  }

  m = s.match(/(?:hapus|delete|remove|buang|ilangin?)\s+(?:data\s+)?member\s+(.+)/i)
  if (m) return { intent: 'delete_member', params: { member_name: m[1].trim() } }

  m = s.match(/(?:hapus|delete|remove|buang|ilangin?)\s+(?:produk\s+)?(.+)/i)
  if (m && !s.match(/\bmember\b/i)) return { intent: 'delete_product', params: { product_name: m[1].trim() } }

  return null
}
