import { formatIDR, toLocalISODate } from './utils'
import { formatPaymentDisplay, getPaymentMethodLabel } from './payments'

export interface ReportOrderItem {
  id: string
  product_id: string
  qty: number
  price: number
  product?: { name?: string | null } | null
}

export interface ReportOrder {
  id: string
  total: number
  payment_method: string
  payment_provider?: string | null
  payment_proof_url?: string | null
  payment_proof_uploaded_at?: string | null
  payment_notes?: string | null
  created_at: string
  member_id?: string | null
  member?: { name?: string | null; phone?: string | null } | null
  order_items?: ReportOrderItem[]
}

export interface ReportMeta {
  businessName: string
  businessAddress?: string | null
  businessPhone?: string | null
  businessEmail?: string | null
  reportTitle: string
  filterLabel: string
  startDate?: string
  endDate?: string
  generatedAt: string
  searchQuery?: string
}

export interface ReportMetrics {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  totalItemsSold: number
  withProofCount: number
  withoutProofCount: number
  proofCoverageRate: number
  paymentMethodBreakdown: Array<{ label: string; count: number; percentage: number }>
  paymentProviderBreakdown: Array<{ label: string; count: number; percentage: number }>
  dailyBreakdown: Array<{ date: string; label: string; revenue: number; orders: number }>
  topTransactions: ReportOrder[]
}

export interface ReportNarrative {
  summaryParagraphs: string[]
  highlights: string[]
  recommendedActions: string[]
}

export interface PreparedReport {
  metrics: ReportMetrics
  narrative: ReportNarrative
}

function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getMethodBreakdown(orders: ReportOrder[]) {
  const counts = new Map<string, number>()
  orders.forEach((o) => counts.set(o.payment_method, (counts.get(o.payment_method) || 0) + 1))
  const total = orders.length || 1
  return Array.from(counts.entries())
    .map(([method, count]) => ({
      label: getPaymentMethodLabel(method),
      count,
      percentage: (count / total) * 100
    }))
    .sort((a, b) => b.count - a.count)
}

function getProviderBreakdown(orders: ReportOrder[]) {
  const qrisOrders = orders.filter((o) => o.payment_method === 'qris')
  const counts = new Map<string, number>()
  qrisOrders.forEach((o) => {
    const label = formatPaymentDisplay(o.payment_method, o.payment_provider)
    counts.set(label, (counts.get(label) || 0) + 1)
  })
  const total = qrisOrders.length || 1
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, percentage: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count)
}

function getDailyBreakdown(orders: ReportOrder[]) {
  const dailyMap = new Map<string, { date: string; label: string; revenue: number; orders: number }>()
  orders.forEach((o) => {
    const date = toLocalISODate(new Date(o.created_at))
    const label = formatShortDate(o.created_at)
    const ex = dailyMap.get(date) || { date, label, revenue: 0, orders: 0 }
    ex.revenue += o.total
    ex.orders += 1
    dailyMap.set(date, ex)
  })
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function buildReportMetrics(orders: ReportOrder[]): ReportMetrics {
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const totalOrders = orders.length
  const totalItemsSold = orders.reduce((s, o) => s + (o.order_items?.reduce((is, i) => is + i.qty, 0) || 0), 0)
  const withProofCount = orders.filter((o) => !!o.payment_proof_url).length
  const withoutProofCount = totalOrders - withProofCount
  const proofCoverageRate = totalOrders > 0 ? (withProofCount / totalOrders) * 100 : 0
  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    totalItemsSold,
    withProofCount,
    withoutProofCount,
    proofCoverageRate,
    paymentMethodBreakdown: getMethodBreakdown(orders),
    paymentProviderBreakdown: getProviderBreakdown(orders),
    dailyBreakdown: getDailyBreakdown(orders),
    topTransactions: [...orders].sort((a, b) => b.total - a.total).slice(0, 5)
  }
}

export function buildReportNarrative(_meta: ReportMeta, orders: ReportOrder[], metrics: ReportMetrics): ReportNarrative {
  const topMethod = metrics.paymentMethodBreakdown[0]
  const topProvider = metrics.paymentProviderBreakdown[0]
  const strongestDay = [...metrics.dailyBreakdown].sort((a, b) => b.revenue - a.revenue)[0]
  const highValueWithoutProof = orders.filter((o) => !o.payment_proof_url).sort((a, b) => b.total - a.total).slice(0, 3)
  const qrisCount = orders.filter((o) => o.payment_method === 'qris').length
  const qrisShare = metrics.totalOrders > 0 ? (qrisCount / metrics.totalOrders) * 100 : 0

  const summaryParagraphs = [
    `${metrics.totalOrders} transaksi dengan total omzet ${formatIDR(metrics.totalRevenue)} dan rata-rata ${formatIDR(metrics.averageOrderValue)} per order.`,
    topMethod
      ? `Metode dominan: ${topMethod.label} (${topMethod.count} transaksi, ${topMethod.percentage.toFixed(0)}%).${topProvider ? ` QRIS provider utama: ${topProvider.label}.` : ''}`
      : 'Belum ada metode dominan pada periode ini.',
    strongestDay
      ? `Penjualan terkuat: ${strongestDay.label} — ${formatIDR(strongestDay.revenue)} dari ${strongestDay.orders} transaksi.`
      : 'Belum ada pola hari penjualan yang teridentifikasi.'
  ]

  const highlights = [
    `Bukti pembayaran: ${metrics.proofCoverageRate.toFixed(0)}% coverage (${metrics.withProofCount}/${metrics.totalOrders} transaksi).`,
    `Total item terjual: ${metrics.totalItemsSold} unit.`,
    qrisCount > 0 ? `QRIS: ${qrisShare.toFixed(0)}% dari semua transaksi.` : 'Belum ada transaksi QRIS.'
  ]

  const recommendedActions: string[] = []
  if (metrics.proofCoverageRate < 70)
    recommendedActions.push('Disiplinkan unggah bukti pembayaran, terutama QRIS dan transfer.')
  if (highValueWithoutProof.length > 0)
    recommendedActions.push(`Audit transaksi tanpa bukti bernilai besar, mulai dari #${highValueWithoutProof[0].id.slice(0, 8).toUpperCase()}.`)
  if (qrisShare >= 40)
    recommendedActions.push('Pastikan alur verifikasi QRIS tetap cepat saat jam sibuk.')
  if (strongestDay)
    recommendedActions.push(`Jadwalkan staf & stok optimal di hari seperti ${strongestDay.label}.`)
  if (recommendedActions.length === 0)
    recommendedActions.push('Pertahankan konsistensi pencatatan dan review laporan secara berkala.')

  return { summaryParagraphs, highlights, recommendedActions }
}

export function prepareReport(meta: ReportMeta, orders: ReportOrder[]): PreparedReport {
  const metrics = buildReportMetrics(orders)
  const narrative = buildReportNarrative(meta, orders, metrics)
  return { metrics, narrative }
}
