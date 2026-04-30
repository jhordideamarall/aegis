import { supabaseAdmin } from '@/lib/supabase'
import { getSemanticMemories, getConversationSummary, buildMemoryContext } from './ai-memory'

export interface SmartContextResult {
  context: string
  shouldClarify: boolean
  clarificationPrompt?: string
}

// Check if user input needs clarification (disabled - let reasoning model handle it)
function needsClarification(userInput: string): boolean {
  return false
}

// Generate clarification prompt based on input (disabled)
function generateClarificationPrompt(userInput: string): string {
  const lower = userInput.toLowerCase()
  
  if (lower.includes('laporan') || lower.includes('report')) {
    return 'Laporan yang mana? Keuangan / Produk / Member'
  }
  if (lower.includes('produk') || lower.includes('barang')) {
    return 'Produk yang ingin dicek apa? Terlaris / Stok menipis / Semua produk'
  }
  if (lower.includes('keuangan') || lower.includes('uang') || lower.includes('revenue') || lower.includes('pendapatan')) {
    return 'Keuangan yang mana? Revenue hari ini / Minggu ini / Bulan ini / Semua'
  }
  if (lower.includes('member') || lower.includes('pelanggan') || lower.includes('customer')) {
    return 'Yang ingin dicek apa? Jumlah member / Member aktif / Loyalty points'
  }
  if (lower.includes('penjualan') || lower.includes('transaksi') || lower.includes('order')) {
    return 'Penjualan yang mana? Hari ini / Minggu ini / Bulan ini'
  }
  if (lower.includes('bisnis') || lower.includes('performa')) {
    return 'Yang ingin kamu tau? Keuangan / Produk / Pelanggan / Semua sekalian'
  }
  
  return 'Mana yang specifically ingin kamu tau? Keuangan / Produk / Pelanggan'
}

// Build optimized business context (lite version)
export async function buildSmartContext(userId: string, businessId: string): Promise<SmartContextResult> {
  const userInput = '' // Will be passed separately
  
  // Get memory from database
  const semanticMemories = await getSemanticMemories(userId)
  const conversationSummary = await getConversationSummary(userId)
  const memoryContext = buildMemoryContext(semanticMemories)
  
  // Fetch lite business data (reduced from original)
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Optimized queries - reduced limits
  const [productsRes, membersRes, recentOrdersRes, statsToday, statsWeek, statsMonth, businessRes, settingsRes] = await Promise.all([
    // Reduced: top 10 products by stock value
    supabaseAdmin.from('products')
      .select('id, name, price, stock, category')
      .eq('business_id', businessId)
      .order('stock', { ascending: false })
      .limit(10),
    
    // Reduced: top 20 members
    supabaseAdmin.from('members')
      .select('id, name, phone, points, total_purchases')
      .eq('business_id', businessId)
      .order('total_purchases', { ascending: false })
      .limit(20),
    
    // Reduced: last 10 orders
    supabaseAdmin.from('orders')
      .select('id, total, created_at, payment_method, member:members(name), order_items(qty, product:products(name))')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10),
    
    // Current stats only - no 12 month history
    calcStats(businessId, todayStart),
    calcStats(businessId, weekStart),
    calcStats(businessId, monthStart),
    supabaseAdmin.from('businesses').select('business_name, industry, city').eq('id', businessId).single(),
    supabaseAdmin.from('settings').select('key, value').eq('business_id', businessId).limit(10),
  ])

  const products = productsRes.data || []
  const members = membersRes.data || []
  const orders = recentOrdersRes.data || []
  const biz = businessRes.data
  const settings = (settingsRes.data || []).reduce<Record<string, string>>((acc, s) => { 
    acc[s.key] = s.value; 
    return acc 
  }, {})

  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`
  const fmtS = (s: { count: number; revenue: number; profit: number; net_revenue: number }) =>
    `${s.count} order | ${fmt(s.revenue)} revenue | ${fmt(s.net_revenue)} net`

  // Build compact context
  const sections = [
    `[PROFIL] ${biz?.business_name || '-'} (${biz?.industry || '-'}) | ${biz?.city || '-'}`,
    `[STAT] Hari ini: ${fmtS(statsToday)} | 7 hari: ${fmtS(statsWeek)} | Bulan ini: ${fmtS(statsMonth)}`,
  ]

  if (products.length > 0) {
    sections.push(`[PRODUK TOP] ${products.slice(0, 5).map(p => `${p.name}(stok:${p.stock})`).join(', ')}`)
  }

  if (members.length > 0) {
    sections.push(`[MEMBER AKTIF] ${members.slice(0, 5).map(m => m.name).join(', ')}`)
  }

  if (orders.length > 0) {
    const recent = orders.slice(0, 3).map(o => {
      const buyer = (o.member as unknown as { name: string } | null)?.name || 'Umum'
      return `${buyer}:${fmt(Number(o.total))}`
    }).join(' | ')
    sections.push(`[ORDER TERBARU] ${recent}`)
  }

  // Add memory context if exists
  if (memoryContext) {
    sections.push(`[MEMORY] ${memoryContext}`)
  }

  // Add conversation summary if exists
  if (conversationSummary?.summary_text) {
    sections.push(`[CHAT HISTORY] ${conversationSummary.summary_text}`)
  }

  // Add settings if relevant
  if (settings.store_name) {
    sections.push(`[CONFIG] Nama Toko: ${settings.store_name}`)
  }

  return {
    context: sections.join('\n'),
    shouldClarify: false // Will be checked at route level
  }
}

// Sync version for building with user input (for clarification check)
export function checkClarification(userInput: string): { needs: boolean; prompt: string } {
  return {
    needs: needsClarification(userInput),
    prompt: generateClarificationPrompt(userInput)
  }
}

async function calcStats(businessId: string, from: Date) {
  const { data: orderData } = await supabaseAdmin
    .from('orders')
    .select('id, total, tax_amount, service_amount')
    .eq('business_id', businessId)
    .gte('created_at', from.toISOString())
  
  if (!orderData?.length) return { count: 0, revenue: 0, profit: 0, net_revenue: 0 }
  
  const revenue = orderData.reduce((s, o) => s + Number(o.total), 0)
  const tax = orderData.reduce((s, o) => s + Number(o.tax_amount || 0), 0)
  const service = orderData.reduce((s, o) => s + Number(o.service_amount || 0), 0)
  
  // Estimate profit (simplified - assume 30% margin)
  const cost = revenue * 0.7
  const profit = revenue - tax - service - cost
  
  return {
    count: orderData.length,
    revenue,
    profit,
    net_revenue: revenue - tax - service
  }
}