import { formatIDR } from '@/lib/utils'
import { formatPaymentDisplay } from '@/lib/payments'
import type { ReportOrder, ReportMeta, ReportMetrics } from '@aegis/core'
import { prepareReport } from '@aegis/core'

export type {
  ReportOrderItem,
  ReportOrder,
  ReportMeta,
  ReportMetrics,
  ReportNarrative,
  PreparedReport,
} from '@aegis/core'

export { buildReportMetrics, buildReportNarrative, prepareReport } from '@aegis/core'

// ── HTML generator (web/print only) ────────────────────────────────────────

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
  if (orders.length === 0) return {}
  const timestamps = orders
    .map((o) => new Date(o.created_at).getTime())
    .filter((v) => !Number.isNaN(v))
    .sort((a, b) => a - b)
  if (timestamps.length === 0) return {}
  return {
    start: new Date(timestamps[0]).toISOString(),
    end: new Date(timestamps[timestamps.length - 1]).toISOString()
  }
}

function getPeriodText(meta: ReportMeta, orders: ReportOrder[]): string {
  const derived = getDerivedPeriod(orders)
  const start = meta.startDate || derived.start
  const end = meta.endDate || derived.end
  if (start && end) return `${formatShortDate(start)} – ${formatShortDate(end)}`
  if (start) return formatShortDate(start)
  return 'Semua periode'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMetricCards(metrics: ReportMetrics): string {
  const cards = [
    { label: 'Total Omzet', value: formatIDR(metrics.totalRevenue) },
    { label: 'Transaksi', value: String(metrics.totalOrders) },
    { label: 'Rata-rata Order', value: formatIDR(metrics.averageOrderValue) },
    { label: 'Coverage Bukti', value: `${metrics.proofCoverageRate.toFixed(0)}%` }
  ]
  return cards.map((c) => `
    <div class="metric-card">
      <div class="metric-label">${escapeHtml(c.label)}</div>
      <div class="metric-value">${escapeHtml(c.value)}</div>
    </div>`).join('')
}

function renderBreakdownRows(rows: Array<{ label: string; count: number; percentage: number }>): string {
  if (rows.length === 0) return '<div class="empty-block">Tidak ada data.</div>'
  return rows.map((r) => `
    <div class="breakdown-row">
      <div class="breakdown-head">
        <span>${escapeHtml(r.label)}</span>
        <span class="muted">${r.count}x &nbsp;${r.percentage.toFixed(0)}%</span>
      </div>
      <div class="breakdown-track">
        <div class="breakdown-fill" style="width:${Math.max(r.percentage, 4)}%"></div>
      </div>
    </div>`).join('')
}

const ROWS_PER_PAGE = 25

function renderTransactionTable(orders: ReportOrder[]): string {
  if (orders.length === 0) return '<div class="empty-block">Tidak ada transaksi pada filter ini.</div>'

  const header = `
    <thead>
      <tr>
        <th style="width:80px">#Order</th>
        <th style="width:110px">Waktu</th>
        <th>Pelanggan</th>
        <th>Pembayaran</th>
        <th style="width:60px">Bukti</th>
        <th style="width:90px;text-align:right">Total</th>
      </tr>
    </thead>`

  const chunks: ReportOrder[][] = []
  for (let i = 0; i < orders.length; i += ROWS_PER_PAGE) {
    chunks.push(orders.slice(i, i + ROWS_PER_PAGE))
  }

  return chunks.map((chunk, idx) => `
    <table class="report-table${idx > 0 ? ' page-break-before' : ''}">
      ${header}
      <tbody>
        ${chunk.map((o) => `
          <tr>
            <td class="mono">#${escapeHtml(o.id.slice(0, 8).toUpperCase())}</td>
            <td class="muted small">${escapeHtml(formatDateTime(o.created_at))}</td>
            <td>${escapeHtml(o.member?.name || 'Umum')}</td>
            <td>
              ${escapeHtml(formatPaymentDisplay(o.payment_method, o.payment_provider))}
              ${o.payment_notes ? `<div class="muted small">${escapeHtml(o.payment_notes)}</div>` : ''}
            </td>
            <td class="${o.payment_proof_url ? 'proof-yes' : 'proof-no'}">${o.payment_proof_url ? '✓' : '–'}</td>
            <td style="text-align:right;font-weight:600">${escapeHtml(formatIDR(o.total))}</td>
          </tr>`).join('')}
      </tbody>
    </table>`).join('')
}

function renderProofAppendix(orders: ReportOrder[]): string {
  const proofOrders = orders.filter((o) => !!o.payment_proof_url)
  if (proofOrders.length === 0) return '<div class="empty-block">Tidak ada bukti pembayaran pada periode ini.</div>'

  return `<div class="proof-grid">` + proofOrders.map((o) => `
    <div class="proof-card">
      <img src="${escapeHtml(o.payment_proof_url || '')}" alt="Bukti #${escapeHtml(o.id.slice(0, 8))}" class="proof-image" />
      <div class="proof-meta">
        <div class="proof-id">#${escapeHtml(o.id.slice(0, 8).toUpperCase())}</div>
        <div class="muted small">${escapeHtml(formatDateTime(o.created_at))}</div>
        <div class="small">${escapeHtml(formatPaymentDisplay(o.payment_method, o.payment_provider))}</div>
        <div class="proof-total">${escapeHtml(formatIDR(o.total))}</div>
      </div>
    </div>`).join('') + `</div>`
}

export function generateReportHtml(
  meta: ReportMeta,
  orders: ReportOrder[],
  options?: { autoPrint?: boolean }
): string {
  const { metrics, narrative } = prepareReport(meta, orders)
  const periodText = getPeriodText(meta, orders)
  const autoPrintScript = options?.autoPrint
    ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print()},900)})</script>`
    : ''

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.reportTitle)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --ink: #111827;
      --muted: #6b7280;
      --line: #e5e7eb;
      --soft: #f9fafb;
      --accent: #1e3a5f;
      --accent-light: #dbeafe;
      --success: #065f46;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: var(--ink);
      background: #f3f4f6;
      font-size: 12px;
      line-height: 1.5;
    }

    .page {
      width: 210mm;
      margin: 0 auto;
      background: #fff;
      padding: 10mm 12mm 12mm;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6mm;
      border-bottom: 2px solid var(--ink);
      margin-bottom: 5mm;
      gap: 16px;
    }
    .report-header-left { flex: 1; }
    .report-label { font-size: 9px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
    .report-title { font-size: 20px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.2; }
    .report-biz { font-size: 11px; color: var(--muted); margin-top: 3px; }
    .report-header-right { text-align: right; flex-shrink: 0; }
    .period-badge { display: inline-block; background: var(--accent); color: #fff; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; margin-bottom: 4px; }
    .report-meta-line { font-size: 9px; color: var(--muted); line-height: 1.6; }

    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 5mm; }
    .metric-card { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; background: var(--soft); }
    .metric-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 4px; }
    .metric-value { font-size: 16px; font-weight: 700; letter-spacing: -0.03em; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 5mm; }
    .panel { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
    .panel-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 6px; }
    .panel p, .panel li { font-size: 11px; line-height: 1.55; color: var(--ink); margin-bottom: 4px; }
    .panel ul, .panel ol { padding-left: 14px; }

    .breakdown-row { margin-bottom: 8px; }
    .breakdown-head { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
    .breakdown-track { height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; }
    .breakdown-fill { height: 100%; background: var(--accent); border-radius: 999px; }

    .section-header { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 5px; padding-bottom: 4px; border-bottom: 1px solid var(--line); }
    .section { margin-bottom: 5mm; }

    .report-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4mm; }
    .report-table th { background: var(--soft); padding: 6px 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); border-bottom: 1px solid var(--line); text-align: left; }
    .report-table td { padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .report-table tr:last-child td { border-bottom: none; }
    .mono { font-family: monospace; font-size: 10px; color: var(--muted); }
    .proof-yes { color: var(--success); font-weight: 700; text-align: center; }
    .proof-no { color: #9ca3af; text-align: center; }
    .page-break-before { page-break-before: always; }

    .proof-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .proof-card { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
    .proof-image { width: 100%; height: 120px; object-fit: cover; display: block; background: var(--soft); }
    .proof-meta { padding: 7px 8px; background: var(--soft); }
    .proof-id { font-weight: 700; font-size: 11px; margin-bottom: 2px; font-family: monospace; }
    .proof-total { font-weight: 600; font-size: 11px; margin-top: 2px; }

    .muted { color: var(--muted); }
    .small { font-size: 10px; }
    .empty-block { border: 1px dashed var(--line); border-radius: 8px; padding: 12px; color: var(--muted); text-align: center; font-size: 11px; }
    .footer-note { margin-top: 6mm; padding-top: 3mm; border-top: 1px solid var(--line); color: var(--muted); font-size: 9px; display: flex; justify-content: space-between; }

    @page { size: A4; margin: 8mm; }
    @media print {
      body { background: white; }
      .page { width: auto; margin: 0; padding: 0; box-shadow: none; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="page">

    <header class="report-header">
      <div class="report-header-left">
        <div class="report-label">AEGIS POS · Sales Report</div>
        <div class="report-title">${escapeHtml(meta.reportTitle)}</div>
        <div class="report-biz">${escapeHtml(meta.businessName)}${meta.businessAddress ? ` · ${escapeHtml(meta.businessAddress)}` : ''}${meta.businessPhone ? ` · ${escapeHtml(meta.businessPhone)}` : ''}</div>
      </div>
      <div class="report-header-right">
        <div class="period-badge">${escapeHtml(periodText)}</div>
        <div class="report-meta-line">
          Filter: ${escapeHtml(meta.filterLabel)}<br/>
          Generated: ${escapeHtml(formatDateTime(meta.generatedAt))}${meta.searchQuery ? `<br/>Query: ${escapeHtml(meta.searchQuery)}` : ''}
        </div>
      </div>
    </header>

    <div class="metrics-grid">${renderMetricCards(metrics)}</div>

    <div class="two-col section">
      <div class="panel">
        <div class="panel-title">Ringkasan</div>
        ${narrative.summaryParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
        <div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--line)">
          ${narrative.highlights.map((h) => `<p>· ${escapeHtml(h)}</p>`).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Rekomendasi</div>
        <ol style="padding-left:14px">
          ${narrative.recommendedActions.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
        </ol>
        <div style="margin-top:8px">
          <div class="panel-title" style="margin-bottom:4px">Top Transaksi</div>
          ${metrics.topTransactions.length > 0
            ? metrics.topTransactions.map((o) => `<p class="small">· #${escapeHtml(o.id.slice(0, 8).toUpperCase())} &nbsp;${escapeHtml(formatIDR(o.total))} &nbsp;<span class="muted">${escapeHtml(formatPaymentDisplay(o.payment_method, o.payment_provider))}</span></p>`).join('')
            : '<p class="small muted">Belum ada transaksi.</p>'}
        </div>
      </div>
    </div>

    <div class="two-col section">
      <div class="panel">
        <div class="panel-title">Metode Pembayaran</div>
        ${renderBreakdownRows(metrics.paymentMethodBreakdown)}
      </div>
      <div class="panel">
        <div class="panel-title">QRIS Provider</div>
        ${renderBreakdownRows(metrics.paymentProviderBreakdown)}
      </div>
    </div>

    <div class="section">
      <div class="section-header">Daftar Transaksi (${orders.length})</div>
      ${renderTransactionTable(orders)}
    </div>

    <div class="section">
      <div class="section-header">Lampiran Bukti Pembayaran</div>
      ${renderProofAppendix(orders)}
    </div>

    <footer class="footer-note">
      <span>Dicetak otomatis dari AEGIS POS · Powered by SocialBrand1980</span>
      <span>${escapeHtml(formatDateTime(meta.generatedAt))}</span>
    </footer>

  </main>
  ${autoPrintScript}
</body>
</html>`
}
