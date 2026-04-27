'use client'

import { useState, useCallback } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import {
  AutomationState, ALL_KEYWORDS, fmt,
  intentToActionType, buildActionPayload, detectLocalIntent, resolvePronoun, parseIDNumber
} from '@/lib/ai/commands'

export type { AutomationState }

export interface StepEntry { text: string; done: boolean }

interface UseAutomationOptions {
  onMessage: (content: string) => void
  onStepStart?: (text: string) => void   // add new running step
  onStepDone?: (text?: string) => void   // mark last step done, optionally update text
  onClearSteps?: () => void              // clear all steps (new chat)
}

export function useAutomation({ onMessage, onStepStart, onStepDone }: UseAutomationOptions) {
  const [pendingAutomation, setPendingAutomation] = useState<AutomationState | null>(null)

  const step = useCallback((text: string) => onStepStart?.(text), [onStepStart])
  const done = useCallback((text?: string) => onStepDone?.(text), [onStepDone])

  const searchProducts = useCallback(async (headers: HeadersInit, q: string) => {
    if (!q.trim()) return []
    const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=10`, { headers })
    return ((await res.json()).data || []) as Array<{ id: string; name: string; stock: number; price: number }>
  }, [])

  const searchMembers = useCallback(async (headers: HeadersInit, q: string) => {
    if (!q.trim()) return []
    const res = await fetch(`/api/members?q=${encodeURIComponent(q)}&limit=10`, { headers })
    return ((await res.json()).data || []) as Array<{ id: string; name: string; points: number; phone?: string; total_purchases?: number }>
  }, [])

  const resolveFromDB = useCallback(async (intent: string, params: Record<string, unknown>): Promise<Omit<AutomationState, 'intent' | 'params'> | null> => {
    const headers = await getClientAuthHeaders() as HeadersInit

    const strictFetchProducts = async (q: string) => {
      if (!q.trim()) return []
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=10`, { headers })
      return ((await res.json()).data || []) as Array<{ id: string; name: string; stock: number; price: number }>
    }
    const strictFetchMembers = async (q: string) => {
      if (!q.trim()) return []
      const res = await fetch(`/api/members?q=${encodeURIComponent(q)}&limit=10`, { headers })
      return ((await res.json()).data || []) as Array<{ id: string; name: string; points: number }>
    }

    if (['update_stock', 'update_price', 'delete_product'].includes(intent)) {
      const q = String(params.product_name || '')
      step(`Mencari produk "${q}"...`)
      let results = await strictFetchProducts(q)
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchProducts(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) { done('Tidak ditemukan'); return null }
      if (results.length > 1) {
        done(`${results.length} hasil ditemukan — pilih yang mana`)
      } else {
        done(`Ditemukan: ${results[0].name}`)
        step('Menunggu konfirmasi...')
      }
      return {
        resolved: { id: results[0].id, name: results[0].name, currentValue: intent === 'update_price' ? results[0].price : results[0].stock },
        multipleMatches: results.length > 1 ? results.slice(0, 6) : undefined
      }
    }

    if (intent === 'update_member_points') {
      const q = String(params.member_name || '')
      if (ALL_KEYWORDS.has(q.toLowerCase().trim())) {
        step('Mengambil semua member...')
        const res = await fetch('/api/members?limit=200', { headers })
        const allMembers = ((await res.json()).data || []) as Array<{ id: string; name: string; points: number }>
        if (allMembers.length === 0) { done('Tidak ada member'); return null }
        done(`${allMembers.length} member siap diupdate`)
        step('Menunggu konfirmasi...')
        return { resolved: { name: 'semua member' }, isBulk: true, bulkItems: allMembers }
      }
      step(`Mencari member "${q}"...`)
      let results = await strictFetchMembers(q)
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchMembers(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) { done('Tidak ditemukan'); return null }
      if (results.length > 1) { done(`${results.length} hasil — pilih yang mana`) }
      else { done(`Ditemukan: ${results[0].name}`); step('Menunggu konfirmasi...') }
      return {
        resolved: { id: results[0].id, name: results[0].name, currentValue: results[0].points },
        multipleMatches: results.length > 1 ? results.slice(0, 6) : undefined
      }
    }

    if (intent === 'delete_member') {
      const q = String(params.member_name || '')
      if (ALL_KEYWORDS.has(q.toLowerCase().trim())) return null
      step(`Mencari member "${q}"...`)
      let results = await strictFetchMembers(q)
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchMembers(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) { done('Tidak ditemukan'); return null }
      if (results.length > 1) { done(`${results.length} hasil — pilih yang mana`) }
      else { done(`Ditemukan: ${results[0].name}`); step('Konfirmasi hapus diperlukan...') }
      return {
        resolved: { id: results[0].id, name: results[0].name, currentValue: results[0].points },
        multipleMatches: results.length > 1 ? results.slice(0, 6) : undefined
      }
    }

    return { resolved: {} }
  }, [])

  const fetchReadIntent = useCallback(async (intent: string, params: Record<string, unknown>): Promise<string> => {
    const headers = await getClientAuthHeaders() as HeadersInit

    if (intent === 'predictive_restock') {
      step('Mengambil data produk & penjualan 7 hari...')
      const [productsRes, ordersRes] = await Promise.all([
        fetch('/api/products?limit=200', { headers }),
        fetch('/api/orders?limit=500&startDate=' + (() => {
          const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]
        })(), { headers }),
      ])
      const productsData = await productsRes.json()
      const ordersData = await ordersRes.json()
      const products: Array<{ id: string; name: string; stock: number }> = productsData.data || []
      const qtyMap: Record<string, number> = {}
      const orders: Array<{ items?: Array<{ product_id?: string; product_name?: string; quantity: number }> }> = ordersData.data || []
      for (const order of orders) {
        for (const item of order.items || []) {
          const key = item.product_id || item.product_name || ''
          if (key) qtyMap[key] = (qtyMap[key] || 0) + item.quantity
        }
      }
      const predictions: Array<{ name: string; stock: number; avgDaily: number; daysLeft: number }> = []
      for (const p of products) {
        const qty7d = qtyMap[p.id] || qtyMap[p.name] || 0
        if (qty7d === 0) continue
        const avgDaily = qty7d / 7
        const daysLeft = p.stock / avgDaily
        if (daysLeft <= 14) predictions.push({ name: p.name, stock: p.stock, avgDaily, daysLeft })
      }
      if (predictions.length === 0) {
        done('Kalkulasi selesai')
        return 'Semua produk stok aman untuk 2 minggu ke depan 👍'
      }
      predictions.sort((a, b) => a.daysLeft - b.daysLeft)
      done(`${predictions.length} produk perlu diperhatikan`)
      const lines = predictions.slice(0, 8).map(p => {
        const days = p.daysLeft < 1 ? '<1 hari' : `~${Math.round(p.daysLeft)} hari`
        return `- **${p.name}**: stok ${p.stock}, habis dalam ${days} (avg ${p.avgDaily.toFixed(1)}/hari)`
      })
      return `**Prediksi Restock (7 hari terakhir):**\n${lines.join('\n')}`
    }

    if (intent === 'export_report') {
      step('Fetching transaction data...')
      const now = new Date()
      const toStr = (d: Date) => d.toISOString().split('T')[0]
      
      let start = String(params.startDate || '')
      let end = String(params.endDate || toStr(now))
      let periodLabel = 'Custom Range'

      if (!start) {
        const period = String(params.period || 'This Week')
        const labelMap: Record<string, string> = { 'Today': 'today', 'This Week': 'week', 'This Month': 'month', 'Last Month': 'last_month', 'This Year': 'year' }
        const p = labelMap[period] || 'week'
        periodLabel = period
        
        end = toStr(now)
        if (p === 'today') start = end
        else if (p === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); start = toStr(d) }
        else if (p === 'month') start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        else if (p === 'last_month') {
          const lastMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const lastMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0)
          start = toStr(lastMonthFirstDay)
          end = toStr(lastMonthLastDay)
        }
        else if (p === 'year') start = `${now.getFullYear()}-01-01`
      } else {
        periodLabel = `${start} to ${end}`
      }
      
      const res = await fetch(`/api/orders?limit=1000&startDate=${start}&endDate=${end}`, { headers })
      const data = await res.json()
      const orders: Array<{ 
        id: string; 
        created_at: string; 
        total: number; 
        tax_amount?: number;
        service_amount?: number;
        payment_method: string; 
        order_items?: Array<{ product?: { name: string }; qty: number; price: number }> 
      }> = data.data || []
      
      if (orders.length === 0) { done('No data found'); return `No transactions found from ${start} to ${end}.` }
      done(`${orders.length} transactions found`)
      step('Generating PDF Report...')
      
      if (typeof window !== 'undefined') {
        type Row = { no: number; date: string; product: string; qty: number | string; unitPrice: number | string; tax: number | string; service: number | string; subtotal: number | string; payment: string }
        const tableRows: Row[] = []
        let no = 1
        let grandTotal = 0
        let totalTax = 0
        let totalService = 0

        for (const o of orders) {
          const date = new Date(o.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          const tax = Number(o.tax_amount) || 0
          const service = Number(o.service_amount) || 0
          grandTotal += o.total
          totalTax += tax
          totalService += service
          
          if (o.order_items?.length) {
            for (let i = 0; i < o.order_items.length; i++) {
              const item = o.order_items[i]
              const sub = item.qty * item.price
              tableRows.push({ 
                no, date, 
                product: item.product?.name || 'Product', 
                qty: item.qty, unitPrice: item.price, 
                tax: i === 0 ? (tax || '-') : '-',
                service: i === 0 ? (service || '-') : '-',
                subtotal: i === 0 ? (sub + tax + service) : sub, 
                payment: i === 0 ? o.payment_method : '' 
              })
              no++
            }
          } else {
            tableRows.push({ no, date, product: 'Direct Transaction', qty: '-', unitPrice: '-', tax: tax || '-', service: service || '-', subtotal: o.total, payment: o.payment_method })
            no++
          }
        }

        const fmtRp = (n: number | string) => typeof n === 'number' ? `Rp${n.toLocaleString('id-ID')}` : n
        const fileName = `Sales_Report_${start}_to_${end}.pdf`
        const trHtml = tableRows.map(r => `
          <tr>
            <td>${r.no}</td>
            <td>${r.date}</td>
            <td style="font-weight:500">${r.product}</td>
            <td style="text-align:center">${r.qty}</td>
            <td style="text-align:right">${fmtRp(r.unitPrice)}</td>
            <td style="text-align:right;color:#666">${fmtRp(r.tax)}</td>
            <td style="text-align:right;color:#666">${fmtRp(r.service)}</td>
            <td style="text-align:right;font-weight:600">${fmtRp(r.subtotal)}</td>
            <td style="text-align:center;text-transform:uppercase;font-size:8px;color:#999">${r.payment}</td>
          </tr>`).join('')

        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${fileName}</title><style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'Inter',sans-serif;font-size:9px;color:#1a1a1a;padding:40px;line-height:1.4}
          .header{margin-bottom:30px;border-bottom:2px solid #000;padding-bottom:15px;display:flex;justify-content:space-between;align-items:flex-end}
          h1{font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em}
          .sub{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.05em}
          table{width:100%;border-collapse:collapse;margin-top:10px}
          th{background:#f8f9fa;color:#000;padding:10px 8px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #000}
          td{padding:8px;border-bottom:1px solid #eee}
          .summary{margin-top:30px;border-top:2px solid #000;padding-top:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
          .summary-label{font-size:8px;color:#666;text-transform:uppercase;margin-bottom:4px}
          .summary-value{font-size:14px;font-weight:700}
          .footer{margin-top:50px;font-size:8px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:15px}
          @media print{body{padding:0}@page{margin:15mm}}
        </style></head><body>
        <div class="header">
          <div><h1>Sales Report</h1><p class="sub">${periodLabel}</p></div>
          <div style="text-align:right"><p class="sub">Range: ${start} — ${end}</p></div>
        </div>
        <table><thead><tr><th>#</th><th>Date</th><th>Item Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Tax</th><th style="text-align:right">Service</th><th style="text-align:right">Total</th><th style="text-align:center">Method</th></tr></thead>
        <tbody>${trHtml}</tbody></table>
        <div class="summary">
          <div><div class="summary-label">Total Tax</div><div class="summary-value">${fmtRp(totalTax)}</div></div>
          <div><div class="summary-label">Total Service</div><div class="summary-value">${fmtRp(totalService)}</div></div>
          <div><div class="summary-label">Gross Revenue</div><div class="summary-value">${fmtRp(grandTotal)}</div></div>
          <div><div class="summary-label">Net Revenue</div><div class="summary-value">${fmtRp(grandTotal - totalTax - totalService)}</div></div>
        </div>
        <p class="footer">This report was automatically generated via AEGIS POS on ${new Date().toLocaleString('en-US')}</p>
        <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},800)})</script>
        </body></html>`
        
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const blobUrl = URL.createObjectURL(blob)
        const win = window.open(blobUrl, '_blank')
        if (win) {
          win.document.title = fileName
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
        }
      }
      done('Success')
      return `✓ **Sales Report (${start} to ${end})** has been generated. The PDF is ready for saving/printing in the new tab.`
    }

    if (intent === 'check_revenue') {
      step('Mengambil data penjualan...')
      const period = String(params.period || 'today')
      const periodMap: Record<string, string> = { 'hari ini': 'today', today: 'today', 'minggu ini': 'week', week: 'week', 'bulan ini': 'month', month: 'month', 'tahun ini': 'year', year: 'year', 'all time': 'all', all: 'all' }
      const p = periodMap[period.toLowerCase()] || 'today'
      const labels: Record<string, string> = { today: 'Hari Ini', week: '7 Hari Terakhir', month: 'Bulan Ini', year: 'Tahun Ini', all: 'All Time' }
      const now = new Date(), toStr = (d: Date) => d.toISOString().split('T')[0], end = toStr(now)
      let start = end
      if (p === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); start = toStr(d) }
      else if (p === 'month') start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      else if (p === 'year') start = `${now.getFullYear()}-01-01`
      else if (p === 'all') start = '2000-01-01'
      const res = await fetch(`/api/dashboard?startDate=${start}&endDate=${end}`, { headers })
      const d = await res.json()
      done(`Revenue ${labels[p]} dihitung`)
      return `**Revenue ${labels[p]}**\n${fmt(d.totalSales || 0)} · Profit ${fmt(d.totalNetProfit || 0)} · ${d.totalOrders || 0} order`
    }
    if (intent === 'find_product') {
      step(`Mencari produk "${params.query}"...`)
      const results = await searchProducts(headers, String(params.query || ''))
      if (results.length === 0) { done('Tidak ditemukan'); return 'Produk tidak ditemukan.' }
      done(`${results.length} produk ditemukan`)
      return results.map(p => `**${p.name}** — ${fmt(p.price)} · Stok: ${p.stock}`).join('\n')
    }
    if (intent === 'find_member') {
      step(`Mencari member "${params.query}"...`)
      const results = await searchMembers(headers, String(params.query || ''))
      if (results.length === 0) { done('Tidak ditemukan'); return 'Member tidak ditemukan.' }
      done(`${results.length} member ditemukan`)
      return results.map(m => `**${m.name}** — ${m.phone || ''} · ${m.points} poin · ${fmt(m.total_purchases || 0)} total`).join('\n')
    }
    if (intent === 'low_stock_alert') {
      step('Mengecek stok semua produk...')
      const res = await fetch('/api/products?limit=200', { headers })
      const data = await res.json()
      const low: Array<{ name: string; stock: number }> = (data.data || []).filter((p: { stock: number }) => p.stock <= 5)
      if (low.length === 0) { done('Semua stok aman'); return 'Semua produk stoknya aman 👍' }
      done(`${low.length} produk stok menipis`)
      return `**Produk stok menipis (≤5):**\n${low.map(p => `- ${p.name}: ${p.stock} sisa`).join('\n')}`
    }
    return 'Tidak ada data.'
  }, [searchProducts, searchMembers])

  const runAutomation = useCallback(async (intent: string, params: Record<string, unknown>) => {
    const readIntents = ['check_revenue', 'find_product', 'find_member', 'low_stock_alert', 'predictive_restock', 'export_report']
    if (readIntents.includes(intent)) {
      const result = await fetchReadIntent(intent, params)
      onMessage(result)
      return
    }

    // create_product: show confirm card with details
    if (intent === 'create_product') {
      const name = String(params.name || '').trim()
      const price = Number(params.price) || 0
      const stock = Number(params.stock) || 0
      const category = String(params.category || '')
      step('Memvalidasi data produk...')
      if (!name || price <= 0) {
        done('Data tidak lengkap')
        onMessage('Lengkapi dulu: nama produk, harga, dan stok.')
        return
      }
      done(`${name} · ${fmt(price)} · stok ${stock}`)
      // Check for duplicate product name before confirming
      step('Mengecek duplikasi produk...')
      try {
        const checkHeaders = await getClientAuthHeaders() as HeadersInit
        const checkRes = await fetch(`/api/products?q=${encodeURIComponent(name)}&limit=5`, { headers: checkHeaders })
        const checkData = await checkRes.json()
        const existing = (checkData.data || []) as Array<{ name: string }>
        const duplicate = existing.find(p => p.name.toLowerCase().trim() === name.toLowerCase())
        if (duplicate) {
          done(`⚠ Produk "${duplicate.name}" sudah ada`)
          onMessage(`Produk **"${duplicate.name}"** sudah terdaftar. Gunakan perintah update stok/harga jika ingin mengubahnya.`)
          return
        }
        done('Tidak ada duplikasi')
      } catch { done('Cek duplikasi dilewati') }
      step('Menunggu konfirmasi...')
      setPendingAutomation({
        intent,
        params: { name, price, stock, category },
        resolved: { name, currentValue: price },
      })
      return
    }

    // create_order: call order-preview then show OrderPreviewCard
    if (intent === 'create_order') {
      const items = params.items as Array<{ product_name: string; qty: number }> | undefined
      const paymentMethod = String(params.payment_method || 'cash')
      if (!items?.length) {
        onMessage('Sebutkan produk dan jumlahnya.')
        return
      }
      step(`Mencari ${items.length} produk...`)
      try {
        const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' }) as HeadersInit
        const res = await fetch('/api/ai/order-preview', {
          method: 'POST',
          headers,
          body: JSON.stringify({ items, payment_method: paymentMethod }),
        })
        const data = await res.json()
        if (!res.ok) {
          done('Produk tidak ditemukan')
          onMessage(`Tidak bisa memproses order: ${data.error || 'coba lagi.'}`)
          return
        }
        const matched = (data.items || []) as Array<{ product_name: string; qty: number }>
        done(`${matched.length} produk dicocokkan`)
        step(`Menghitung total · bayar ${paymentMethod}...`)
        done(`Total ${fmt(Number(data.total))} · siap dikonfirmasi`)
        step('Menunggu konfirmasi...')
        setPendingAutomation({
          intent: 'create_order',
          params: { ...data, payment_method: paymentMethod },
          resolved: { name: 'Order Baru' },
        })
      } catch {
        done('Gagal')
        onMessage('Error saat memproses order, coba lagi.')
      }
      return
    }

    if (intent === 'update_settings') {
      setPendingAutomation({ intent, params, resolved: {} })
      return
    }
    const dbResult = await resolveFromDB(intent, params)
    if (!dbResult) {
      const nameParam = String(params.product_name || params.member_name || '').trim()
      const isAllKeyword = ALL_KEYWORDS.has(nameParam.toLowerCase())
      const name = String(params.product_name || params.member_name || '')
      const errorMsg = isAllKeyword
        ? intent === 'delete_member'
          ? 'Hapus semua member tidak diizinkan. Masukkan nama member yang spesifik.'
          : 'Perlu nama yang spesifik — bulk tidak didukung untuk aksi ini.'
        : name
          ? `"${name}" tidak ditemukan. Cek ejaan dan coba lagi.`
          : 'Nama produk/member-nya apa?'
      onMessage(errorMsg)
      return
    }
    setPendingAutomation({ intent, params, resolved: dbResult.resolved, multipleMatches: dbResult.multipleMatches, isBulk: dbResult.isBulk, bulkItems: dbResult.bulkItems })
  }, [fetchReadIntent, resolveFromDB, onMessage])

  const confirmAutomation = useCallback(async () => {
    if (!pendingAutomation) return
    const automation = pendingAutomation
    setPendingAutomation(null)

    // Handle create_product
    if (automation.intent === 'create_product') {
      done('Dikonfirmasi — menyimpan...')
      step('Menyimpan produk baru...')
      try {
        const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
        const res = await fetch('/api/ai/action', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'create_product',
            payload: {
              name: automation.params.name,
              price: automation.params.price,
              stock: automation.params.stock,
              category: automation.params.category,
            }
          })
        })
        const data = await res.json()
        done(res.ok ? 'Produk berhasil dibuat' : 'Gagal')
        onMessage(res.ok ? `✓ ${data.message}` : `Gagal: ${data.error}`)
      } catch { done('Error'); onMessage('Error saat membuat produk.') }
      return
    }

    // Handle create_order
    if (automation.intent === 'create_order') {
      done('Dikonfirmasi — mencatat transaksi...')
      step('Mencatat ke database...')
      const orderData = automation.params as {
        items: Array<{ product_id: string; product_name: string; qty: number; unit_price: number; subtotal: number }>
        total: number
        payment_method: string
      }
      try {
        const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items: orderData.items.map(i => ({
              product_id: i.product_id,
              qty: i.qty,
              price: i.unit_price,
            })),
            total: orderData.total,
            payment_method: orderData.payment_method,
          })
        })
        const data = await res.json()
        if (res.ok) {
          const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
          done('Order berhasil dicatat')
          onMessage(`✓ **Order dicatat!**\nTotal: ${fmtCurrency(orderData.total)} · Bayar: ${orderData.payment_method}\nOrder #${data.id?.slice(-6).toUpperCase() || 'OK'}`)
        } else {
          done('Gagal')
          onMessage(`Gagal mencatat order: ${data.error}`)
        }
      } catch { done('Error'); onMessage('Error saat mencatat order.') }
      return
    }

    if (automation.isBulk && automation.bulkItems) {
      const type = intentToActionType(automation.intent)
      done('Dikonfirmasi')
      step(`Mengupdate ${automation.bulkItems.length} member...`)
      try {
        const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
        let successCount = 0, failCount = 0
        for (const item of automation.bulkItems) {
          const payload = buildActionPayload({ ...automation, resolved: { id: item.id, name: item.name } })
          const res = await fetch('/api/ai/action', { method: 'POST', headers, body: JSON.stringify({ type, payload }) })
          if (res.ok) successCount++; else failCount++
        }
        done(failCount === 0 ? `${successCount} member diupdate` : `${successCount} ok, ${failCount} gagal`)
        onMessage(failCount === 0 ? `✓ ${successCount} member berhasil diupdate` : `${successCount} berhasil, ${failCount} gagal`)
      } catch { done('Error'); onMessage('Error saat eksekusi bulk.') }
      return
    }

    const type = intentToActionType(automation.intent)
    const payload = buildActionPayload(automation)
    done('Dikonfirmasi — mengeksekusi...')
    step('Menyimpan perubahan...')
    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/ai/action', { method: 'POST', headers, body: JSON.stringify({ type, payload }) })
      const data = await res.json()
      done(res.ok ? 'Berhasil disimpan' : 'Gagal')
      onMessage(res.ok ? `✓ ${data.message || 'Berhasil'}` : `Gagal: ${data.error}`)
    } catch { done('Error'); onMessage('Error saat eksekusi.') }
  }, [pendingAutomation, onMessage, step, done])

  const cancelAutomation = useCallback(() => {
    setPendingAutomation(null)
    done('Dibatalkan')
    onMessage('Oke, dibatalin.')
  }, [onMessage, done])

  const selectMatch = useCallback((match: { id: string; name: string; [key: string]: unknown }) => {
    if (!pendingAutomation) return
    const cv = (pendingAutomation.intent === 'update_price' ? match.price : pendingAutomation.intent === 'update_member_points' ? match.points : match.stock) as number
    setPendingAutomation({ ...pendingAutomation, resolved: { id: match.id, name: match.name, currentValue: cv }, multipleMatches: undefined })
  }, [pendingAutomation])

  // Pre-process user input before sending to AI
  const preprocessInput = useCallback((userInput: string, lastAssistantMsg: string) => {
    const resolved = resolvePronoun(parseIDNumber(userInput), lastAssistantMsg)
    return detectLocalIntent(resolved) ? { localIntent: detectLocalIntent(resolved)!, resolvedInput: resolved } : { localIntent: null, resolvedInput: resolved }
  }, [])

  return {
    pendingAutomation, setPendingAutomation,
    runAutomation, confirmAutomation, cancelAutomation, selectMatch,
    preprocessInput, detectLocalIntent, parseIDNumber,
  }
}
