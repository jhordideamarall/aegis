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
      step('Mengambil data transaksi...')
      const period = String(params.period || 'week')
      const now = new Date()
      const toStr = (d: Date) => d.toISOString().split('T')[0]
      const end = toStr(now)
      let start = end
      const periodLabels: Record<string, string> = { today: 'Hari Ini', week: '7 Hari Terakhir', month: 'Bulan Ini', year: 'Tahun Ini' }
      if (period === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); start = toStr(d) }
      else if (period === 'month') start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      else if (period === 'year') start = `${now.getFullYear()}-01-01`
      const res = await fetch(`/api/orders?limit=1000&startDate=${start}&endDate=${end}`, { headers })
      const data = await res.json()
      const orders: Array<{ id: string; created_at: string; total_amount: number; payment_method: string; items?: Array<{ product_name: string; quantity: number; unit_price: number }> }> = data.data || []
      if (orders.length === 0) { done('Tidak ada data'); return 'Tidak ada transaksi untuk periode ini.' }
      done(`${orders.length} transaksi ditemukan`)
      step('Membuat laporan PDF...')
      if (typeof window !== 'undefined') {
        // Build table rows
        type Row = { no: number; date: string; product: string; qty: number | string; unitPrice: number | string; subtotal: number | string; payment: string }
        const tableRows: Row[] = []
        let no = 1
        let grandTotal = 0
        for (const o of orders) {
          const date = new Date(o.created_at).toLocaleDateString('id-ID')
          if (o.items?.length) {
            for (const item of o.items) {
              const sub = item.quantity * item.unit_price
              tableRows.push({ no, date, product: item.product_name, qty: item.quantity, unitPrice: item.unit_price, subtotal: sub, payment: o.payment_method })
              grandTotal += sub; no++
            }
          } else {
            tableRows.push({ no, date, product: '-', qty: '-', unitPrice: '-', subtotal: o.total_amount, payment: o.payment_method })
            grandTotal += o.total_amount; no++
          }
        }
        const fmtRp = (n: number | string) => typeof n === 'number' ? `Rp${n.toLocaleString('id-ID')}` : n
        const trHtml = tableRows.map(r => `<tr><td>${r.no}</td><td>${r.date}</td><td>${r.product}</td><td style="text-align:center">${r.qty}</td><td style="text-align:right">${fmtRp(r.unitPrice)}</td><td style="text-align:right">${fmtRp(r.subtotal)}</td><td style="text-align:center">${r.payment}</td></tr>`).join('')
        const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan Penjualan</title><style>
          *{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;font-size:11px;color:#111;padding:24px}
          h1{font-size:16px;font-weight:700;margin-bottom:2px}p.sub{font-size:11px;color:#6b7280;margin-bottom:16px}
          table{width:100%;border-collapse:collapse;margin-bottom:16px}
          th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
          td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}
          tr:nth-child(even) td{background:#f8fafc}
          .total{text-align:right;font-size:13px;font-weight:700;color:#1e293b;margin-top:8px}
          .footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:center}
          @media print{body{padding:0}@page{margin:16mm}}
        </style></head><body>
        <h1>Laporan Penjualan — ${periodLabels[period] || period}</h1>
        <p class="sub">Periode: ${start === end ? end : `${start} s/d ${end}`} · Digenerate: ${new Date().toLocaleString('id-ID')}</p>
        <table><thead><tr><th>#</th><th>Tanggal</th><th>Produk</th><th style="text-align:center">Qty</th><th style="text-align:right">Harga Satuan</th><th style="text-align:right">Subtotal</th><th style="text-align:center">Metode Bayar</th></tr></thead>
        <tbody>${trHtml}</tbody></table>
        <p class="total">Total: Rp${grandTotal.toLocaleString('id-ID')}</p>
        <p class="footer">${tableRows.length} baris · AEGIS POS</p>
        <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},600)})</script>
        </body></html>`
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const blobUrl = URL.createObjectURL(blob)
        const win = window.open(blobUrl, '_blank')
        if (win) setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
      }
      done('Laporan siap dicetak / disimpan PDF')
      return `✓ Laporan **${periodLabels[period] || period}** terbuka di tab baru — pilih **Save as PDF** di dialog print.\n${orders.length} transaksi.`
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
