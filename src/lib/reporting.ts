import { formatIDR, toLocalISODate } from '@/lib/utils'
import { formatPaymentDisplay, getPaymentMethodLabel } from '@/lib/payments'

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

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getDerivedPeriod(orders: ReportOrder[]): { start?: string; end?: string } {
  if (orders.length === 0) {
    return {}
  }

  const timestamps = orders
    .map((order) => new Date(order.created_at).getTime())
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b)

  if (timestamps.length === 0) {
    return {}
  }

  return {
    start: new Date(timestamps[0]).toISOString(),
    end: new Date(timestamps[timestamps.length - 1]).toISOString()
  }
}

function getPeriodText(meta: ReportMeta, orders: ReportOrder[]): string {
  const derived = getDerivedPeriod(orders)
  const periodStart = meta.startDate || derived.start
  const periodEnd = meta.endDate || derived.end

  if (periodStart && periodEnd) {
    return `${formatShortDate(periodStart)} - ${formatShortDate(periodEnd)}`
  }

  if (periodStart) {
    return `${formatShortDate(periodStart)}`
  }

  return 'Semua periode transaksi'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getMethodBreakdown(orders: ReportOrder[]) {
  const counts = new Map<string, number>()

  orders.forEach((order) => {
    counts.set(order.payment_method, (counts.get(order.payment_method) || 0) + 1)
  })

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
  const qrisOrders = orders.filter((order) => order.payment_method === 'qris')
  const counts = new Map<string, number>()

  qrisOrders.forEach((order) => {
    const label = formatPaymentDisplay(order.payment_method, order.payment_provider)
    counts.set(label, (counts.get(label) || 0) + 1)
  })

  const total = qrisOrders.length || 1

  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: (count / total) * 100
    }))
    .sort((a, b) => b.count - a.count)
}

function getDailyBreakdown(orders: ReportOrder[]) {
  const dailyMap = new Map<string, { date: string; label: string; revenue: number; orders: number }>()

  orders.forEach((order) => {
    const date = toLocalISODate(new Date(order.created_at))
    const label = formatShortDate(order.created_at)
    const existing = dailyMap.get(date) || { date, label, revenue: 0, orders: 0 }
    existing.revenue += order.total
    existing.orders += 1
    dailyMap.set(date, existing)
  })

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function buildReportMetrics(orders: ReportOrder[]): ReportMetrics {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = orders.length
  const totalItemsSold = orders.reduce((sum, order) => {
    return sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.qty, 0) || 0)
  }, 0)
  const withProofCount = orders.filter((order) => !!order.payment_proof_url).length
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

export function buildReportNarrative(meta: ReportMeta, orders: ReportOrder[], metrics: ReportMetrics): ReportNarrative {
  const topMethod = metrics.paymentMethodBreakdown[0]
  const topProvider = metrics.paymentProviderBreakdown[0]
  const strongestDay = [...metrics.dailyBreakdown].sort((a, b) => b.revenue - a.revenue)[0]
  const highValueWithoutProof = orders
    .filter((order) => !order.payment_proof_url)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
  const qrisCount = orders.filter((order) => order.payment_method === 'qris').length
  const qrisShare = metrics.totalOrders > 0 ? (qrisCount / metrics.totalOrders) * 100 : 0

  const summaryParagraphs = [
    `${meta.reportTitle} ini merangkum ${metrics.totalOrders} transaksi dengan total omzet ${formatIDR(metrics.totalRevenue)} dan rata-rata nilai order ${formatIDR(metrics.averageOrderValue)}.`,
    topMethod
      ? `Metode pembayaran paling dominan adalah ${topMethod.label} dengan kontribusi ${topMethod.count} transaksi (${topMethod.percentage.toFixed(0)}%).${topProvider ? ` Untuk kanal QRIS, provider paling sering dipakai adalah ${topProvider.label}.` : ''}`
      : 'Belum ada metode pembayaran dominan pada periode ini.',
    strongestDay
      ? `Hari penjualan terkuat jatuh pada ${strongestDay.label} dengan omzet ${formatIDR(strongestDay.revenue)} dari ${strongestDay.orders} transaksi.`
      : 'Belum ada pola hari penjualan yang bisa diidentifikasi pada periode ini.'
  ]

  const highlights = [
    `Coverage bukti pembayaran tercatat ${metrics.proofCoverageRate.toFixed(0)}% (${metrics.withProofCount} dari ${metrics.totalOrders} transaksi).`,
    `Total item terjual pada periode ini mencapai ${metrics.totalItemsSold} unit.`,
    qrisCount > 0
      ? `Pembayaran QRIS mewakili ${qrisShare.toFixed(0)}% dari seluruh transaksi.`
      : 'Belum ada transaksi QRIS pada periode ini.'
  ]

  const recommendedActions: string[] = []

  if (metrics.proofCoverageRate < 70) {
    recommendedActions.push('Prioritaskan disiplin unggah bukti pembayaran untuk transaksi QRIS dan bank transfer, terutama pada transaksi bernilai besar.')
  }

  if (highValueWithoutProof.length > 0) {
    recommendedActions.push(`Audit manual transaksi tanpa bukti dengan nominal tertinggi, seperti order #${highValueWithoutProof[0].id.slice(0, 8).toUpperCase()}.`)
  }

  if (qrisShare >= 40) {
    recommendedActions.push('Optimalkan operasional pembayaran digital dengan memastikan alur QRIS dan verifikasi bukti pembayaran tetap cepat saat jam sibuk.')
  }

  if (strongestDay) {
    recommendedActions.push(`Gunakan pola penjualan tertinggi pada ${strongestDay.label} sebagai acuan penjadwalan staf dan stok barang.`)
  }

  if (recommendedActions.length === 0) {
    recommendedActions.push('Pertahankan konsistensi pencatatan transaksi dan review laporan ini secara berkala untuk mendeteksi perubahan pola pembayaran.')
  }

  return {
    summaryParagraphs,
    highlights,
    recommendedActions
  }
}

export function prepareReport(meta: ReportMeta, orders: ReportOrder[]): PreparedReport {
  const metrics = buildReportMetrics(orders)
  const narrative = buildReportNarrative(meta, orders, metrics)
  return { metrics, narrative }
}

function renderMetricCards(metrics: ReportMetrics): string {
  const cards = [
    { label: 'Total Omzet', value: formatIDR(metrics.totalRevenue) },
    { label: 'Total Transaksi', value: String(metrics.totalOrders) },
    { label: 'Rata-rata Order', value: formatIDR(metrics.averageOrderValue) },
    { label: 'Coverage Bukti', value: `${metrics.proofCoverageRate.toFixed(0)}%` }
  ]

  return cards
    .map(
      (card) => `
        <div class="metric-card">
          <div class="metric-label">${escapeHtml(card.label)}</div>
          <div class="metric-value">${escapeHtml(card.value)}</div>
        </div>
      `
    )
    .join('')
}

function renderBreakdownRows(rows: Array<{ label: string; count: number; percentage: number }>): string {
  if (rows.length === 0) {
    return '<div class="empty-block">Belum ada data pada bagian ini.</div>'
  }

  return rows
    .map(
      (row) => `
        <div class="breakdown-row">
          <div class="breakdown-head">
            <span>${escapeHtml(row.label)}</span>
            <span>${row.count} transaksi (${row.percentage.toFixed(0)}%)</span>
          </div>
          <div class="breakdown-track">
            <div class="breakdown-fill" style="width:${Math.max(row.percentage, 4)}%"></div>
          </div>
        </div>
      `
    )
    .join('')
}

function renderTransactionTable(orders: ReportOrder[]): string {
  if (orders.length === 0) {
    return '<div class="empty-block">Tidak ada transaksi yang cocok dengan filter report ini.</div>'
  }

  return `
    <table class="report-table">
      <thead>
        <tr>
          <th>ID Order</th>
          <th>Waktu</th>
          <th>Pelanggan</th>
          <th>Pembayaran</th>
          <th>Status Bukti</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${orders
          .map(
            (order) => `
              <tr>
                <td>#${escapeHtml(order.id.slice(0, 8).toUpperCase())}</td>
                <td>${escapeHtml(formatDateTime(order.created_at))}</td>
                <td>${escapeHtml(order.member?.name || 'General Customer')}</td>
                <td>
                  <div>${escapeHtml(formatPaymentDisplay(order.payment_method, order.payment_provider))}</div>
                  ${order.payment_notes ? `<div class="muted small">${escapeHtml(order.payment_notes)}</div>` : ''}
                </td>
                <td>${order.payment_proof_url ? 'Tersedia' : 'Tidak ada'}</td>
                <td>${escapeHtml(formatIDR(order.total))}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `
}

function renderProofAppendix(orders: ReportOrder[]): string {
  const proofOrders = orders.filter((order) => !!order.payment_proof_url)

  if (proofOrders.length === 0) {
    return '<div class="empty-block">Tidak ada lampiran bukti pembayaran pada periode ini.</div>'
  }

  return proofOrders
    .map(
      (order) => `
        <div class="proof-card">
          <div class="proof-meta">
            <div class="proof-order">#${escapeHtml(order.id.slice(0, 8).toUpperCase())}</div>
            <div>${escapeHtml(formatDateTime(order.created_at))}</div>
            <div>${escapeHtml(formatPaymentDisplay(order.payment_method, order.payment_provider))}</div>
            <div>${escapeHtml(formatIDR(order.total))}</div>
            ${order.payment_notes ? `<div class="muted">${escapeHtml(order.payment_notes)}</div>` : ''}
          </div>
          <div class="proof-image-wrap">
            <img src="${escapeHtml(order.payment_proof_url || '')}" alt="Bukti pembayaran ${escapeHtml(order.id)}" class="proof-image" />
          </div>
        </div>
      `
    )
    .join('')
}

export function generateReportHtml(
  meta: ReportMeta,
  orders: ReportOrder[],
  options?: { autoPrint?: boolean }
): string {
  const { metrics, narrative } = prepareReport(meta, orders)
  const derivedPeriod = getDerivedPeriod(orders)
  const periodText = getPeriodText(meta, orders)
  const autoPrintScript = options?.autoPrint
    ? `
        <script>
          window.addEventListener('load', function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 900);
          });
        </script>
      `
    : ''

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(meta.reportTitle)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

          :root {
            --ink: #142033;
            --muted: #617089;
            --line: #d9e0ea;
            --soft: #f4f6fa;
            --accent: #173b63;
            --accent-soft: #dce7f5;
            --accent-deep: #0f2742;
            --success: #0b7a55;
            --paper-shadow: 0 28px 80px -40px rgba(20, 32, 51, 0.35);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Poppins", "Helvetica Neue", Helvetica, Arial, sans-serif;
            color: var(--ink);
            background:
              radial-gradient(circle at top left, rgba(220, 231, 245, 0.7), transparent 36%),
              linear-gradient(180deg, #eef2f7 0%, #e9edf4 100%);
          }
          .page {
            width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 16mm 14mm 18mm;
            box-shadow: var(--paper-shadow);
          }
          .header {
            border-bottom: 1px solid rgba(20, 32, 51, 0.12);
            padding-bottom: 9mm;
            margin-bottom: 8mm;
          }
          .eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.22em;
            font-size: 10px;
            color: var(--accent);
            margin-bottom: 12px;
            font-weight: 700;
          }
          .title {
            font-size: 30px;
            line-height: 1.15;
            margin: 0;
            letter-spacing: -0.03em;
          }
          .subtitle {
            margin-top: 12px;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.6;
            max-width: 760px;
          }
          .hero-band {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 14px;
            margin-top: 18px;
            align-items: stretch;
          }
          .period-card {
            padding: 16px 18px;
            border-radius: 18px;
            background: linear-gradient(135deg, var(--accent-deep) 0%, var(--accent) 100%);
            color: white;
          }
          .period-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            opacity: 0.7;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .period-value {
            font-size: 24px;
            line-height: 1.25;
            font-weight: 700;
            letter-spacing: -0.03em;
          }
          .period-footnote {
            margin-top: 10px;
            font-size: 12px;
            line-height: 1.6;
            color: rgba(255,255,255,0.8);
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 0;
          }
          .meta-card, .metric-card, .summary-card, .panel {
            border: 1px solid var(--line);
            border-radius: 18px;
            background: #fff;
          }
          .meta-card {
            padding: 14px;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          }
          .meta-label, .metric-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: var(--muted);
            margin-bottom: 8px;
            font-weight: 600;
          }
          .meta-value, .metric-value {
            font-size: 14px;
            font-weight: 700;
            line-height: 1.4;
          }
          .section {
            margin-top: 8mm;
          }
          .section-title {
            font-size: 18px;
            margin: 0 0 14px;
            letter-spacing: -0.02em;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
          .metric-card {
            padding: 16px;
            background: linear-gradient(180deg, #fff 0%, #f7f9fd 100%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
          }
          .metric-value {
            font-size: 23px;
            letter-spacing: -0.03em;
          }
          .summary-layout {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 16px;
          }
          .summary-card {
            padding: 18px;
          }
          .summary-card p {
            margin: 0 0 12px;
            line-height: 1.7;
            font-size: 13px;
          }
          .bullet-list {
            margin: 0;
            padding-left: 18px;
          }
          .bullet-list li {
            margin-bottom: 10px;
            line-height: 1.6;
            font-size: 13px;
          }
          .breakdown-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .panel {
            padding: 18px;
          }
          .panel h3 {
            margin: 0 0 12px;
            font-size: 15px;
            letter-spacing: -0.02em;
          }
          .breakdown-row {
            margin-bottom: 12px;
          }
          .breakdown-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 12px;
            margin-bottom: 6px;
          }
          .breakdown-track {
            height: 10px;
            background: #edf1f7;
            border-radius: 999px;
            overflow: hidden;
          }
          .breakdown-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--accent-deep) 0%, #3d73b8 100%);
            border-radius: 999px;
          }
          .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .report-table th,
          .report-table td {
            padding: 10px 8px;
            border: 1px solid var(--line);
            text-align: left;
            vertical-align: top;
          }
          .report-table th {
            background: #f6f8fc;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 700;
          }
          .muted {
            color: var(--muted);
          }
          .small {
            font-size: 11px;
            line-height: 1.5;
          }
          .proof-grid {
            display: grid;
            gap: 14px;
          }
          .proof-card {
            display: grid;
            grid-template-columns: 220px 1fr;
            gap: 16px;
            border: 1px solid var(--line);
            border-radius: 18px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .proof-meta {
            padding: 14px;
            background: linear-gradient(180deg, #f8fafc 0%, #eef3f9 100%);
            font-size: 12px;
            line-height: 1.7;
          }
          .proof-order {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .proof-image-wrap {
            padding: 14px;
          }
          .proof-image {
            width: 100%;
            height: 240px;
            object-fit: cover;
            border-radius: 12px;
            border: 1px solid var(--line);
          }
          .empty-block {
            border: 1px dashed var(--line);
            border-radius: 14px;
            padding: 18px;
            color: var(--muted);
            text-align: center;
            font-size: 13px;
          }
          .footer-note {
            margin-top: 10mm;
            padding-top: 4mm;
            border-top: 1px solid var(--line);
            color: var(--muted);
            font-size: 11px;
            line-height: 1.6;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
          @media print {
            body {
              background: white;
            }
            .page {
              width: auto;
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <div class="eyebrow">Intelligent Aegis Report</div>
            <h1 class="title">${escapeHtml(meta.reportTitle)}</h1>
            <div class="subtitle">
              ${escapeHtml(meta.businessName)}${meta.businessAddress ? ` • ${escapeHtml(meta.businessAddress)}` : ''}<br />
              Dokumen ini dirangkum otomatis dari pola transaksi, pembayaran, dan bukti pembayaran yang tercatat pada sistem.
            </div>
            <div class="hero-band">
              <div class="period-card">
                <div class="period-label">Periode Laporan</div>
                <div class="period-value">${escapeHtml(periodText)}</div>
                <div class="period-footnote">
                  Filter aktif: ${escapeHtml(meta.filterLabel)}<br />
                  Generated: ${escapeHtml(formatDateTime(meta.generatedAt))}
                </div>
              </div>
              <div class="meta-grid">
                <div class="meta-card">
                  <div class="meta-label">Tanggal Mulai</div>
                  <div class="meta-value">${escapeHtml(meta.startDate ? formatShortDate(meta.startDate) : (derivedPeriod.start ? formatShortDate(derivedPeriod.start) : 'Semua data'))}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Tanggal Akhir</div>
                  <div class="meta-value">${escapeHtml(meta.endDate ? formatShortDate(meta.endDate) : (derivedPeriod.end ? formatShortDate(derivedPeriod.end) : 'Sampai terbaru'))}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Jenis Filter</div>
                  <div class="meta-value">${escapeHtml(meta.filterLabel)}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Search Query</div>
                  <div class="meta-value">${escapeHtml(meta.searchQuery || 'Tanpa pencarian')}</div>
                </div>
              </div>
            </div>
          </header>

          <section class="section">
            <h2 class="section-title">Executive Metrics</h2>
            <div class="metrics-grid">${renderMetricCards(metrics)}</div>
          </section>

          <section class="section summary-layout">
            <div class="summary-card">
              <h2 class="section-title">Executive Summary</h2>
              ${narrative.summaryParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
            </div>
            <div class="summary-card">
              <h2 class="section-title">Recommended Actions</h2>
              <ol class="bullet-list">
                ${narrative.recommendedActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
              </ol>
            </div>
          </section>

          <section class="section breakdown-grid">
            <div class="panel">
              <h3>Payment Method Breakdown</h3>
              ${renderBreakdownRows(metrics.paymentMethodBreakdown)}
            </div>
            <div class="panel">
              <h3>QRIS Provider Breakdown</h3>
              ${renderBreakdownRows(metrics.paymentProviderBreakdown)}
            </div>
          </section>

          <section class="section summary-layout">
            <div class="summary-card">
              <h2 class="section-title">Operational Highlights</h2>
              <ul class="bullet-list">
                ${narrative.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
              </ul>
            </div>
            <div class="summary-card">
              <h2 class="section-title">Top Transactions</h2>
              <ul class="bullet-list">
                ${metrics.topTransactions.length > 0
                  ? metrics.topTransactions.map((order) => `<li>#${escapeHtml(order.id.slice(0, 8).toUpperCase())} • ${escapeHtml(formatIDR(order.total))} • ${escapeHtml(formatPaymentDisplay(order.payment_method, order.payment_provider))}</li>`).join('')
                  : '<li>Belum ada transaksi pada periode ini.</li>'}
              </ul>
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">Detailed Transaction Register</h2>
            ${renderTransactionTable(orders)}
          </section>

          <section class="section">
            <h2 class="section-title">Payment Proof Appendix</h2>
            <div class="proof-grid">
              ${renderProofAppendix(orders)}
            </div>
          </section>

          <footer class="footer-note">
            Report ini disusun otomatis dari data transaksi pada sistem POS. Untuk arsip resmi, gunakan fitur Print atau Save as PDF dari browser setelah dokumen ini terbuka.
            <br />
            Powered by SocialBrand1980
          </footer>
        </main>
        ${autoPrintScript}
      </body>
    </html>
  `
}
