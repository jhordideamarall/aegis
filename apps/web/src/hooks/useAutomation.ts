'use client'

import { useState, useCallback } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import {
  AutomationState, ALL_KEYWORDS, fmt,
  intentToActionType, buildActionPayload, detectLocalIntent, resolvePronoun, parseIDNumber
} from '@/lib/ai/commands'

export type { AutomationState }

interface UseAutomationOptions {
  onMessage: (content: string) => void
}

export function useAutomation({ onMessage }: UseAutomationOptions) {
  const [pendingAutomation, setPendingAutomation] = useState<AutomationState | null>(null)

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
      let results = await strictFetchProducts(q)
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchProducts(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) return null
      return {
        resolved: { id: results[0].id, name: results[0].name, currentValue: intent === 'update_price' ? results[0].price : results[0].stock },
        multipleMatches: results.length > 1 ? results.slice(0, 6) : undefined
      }
    }

    if (intent === 'update_member_points') {
      const q = String(params.member_name || '')
      if (ALL_KEYWORDS.has(q.toLowerCase().trim())) {
        const res = await fetch('/api/members?limit=200', { headers })
        const allMembers = ((await res.json()).data || []) as Array<{ id: string; name: string; points: number }>
        if (allMembers.length === 0) return null
        return { resolved: { name: 'semua member' }, isBulk: true, bulkItems: allMembers }
      }
      let results = await strictFetchMembers(q)
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchMembers(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) return null
      return {
        resolved: { id: results[0].id, name: results[0].name, currentValue: results[0].points },
        multipleMatches: results.length > 1 ? results.slice(0, 6) : undefined
      }
    }

    if (intent === 'delete_member') {
      const q = String(params.member_name || '')
      if (ALL_KEYWORDS.has(q.toLowerCase().trim())) return null
      let results = await strictFetchMembers(q)
      if (results.length === 0) {
        for (const token of q.split(/\s+/).filter(t => t.length >= 3)) {
          results = await strictFetchMembers(token)
          if (results.length > 0) break
        }
      }
      if (results.length === 0) return null
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
      if (predictions.length === 0) return 'Semua produk stok aman untuk 2 minggu ke depan 👍'
      predictions.sort((a, b) => a.daysLeft - b.daysLeft)
      const lines = predictions.slice(0, 8).map(p => {
        const days = p.daysLeft < 1 ? '<1 hari' : `~${Math.round(p.daysLeft)} hari`
        return `- **${p.name}**: stok ${p.stock}, habis dalam ${days} (avg ${p.avgDaily.toFixed(1)}/hari)`
      })
      return `**Prediksi Restock (7 hari terakhir):**\n${lines.join('\n')}`
    }

    if (intent === 'export_report') {
      const period = String(params.period || 'week')
      const now = new Date()
      const toStr = (d: Date) => d.toISOString().split('T')[0]
      const end = toStr(now)
      let start = end
      const filenameLabels: Record<string, string> = { today: 'hari-ini', week: 'minggu-ini', month: 'bulan-ini', year: 'tahun-ini' }
      if (period === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); start = toStr(d) }
      else if (period === 'month') start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      else if (period === 'year') start = `${now.getFullYear()}-01-01`
      const res = await fetch(`/api/orders?limit=1000&startDate=${start}&endDate=${end}`, { headers })
      const data = await res.json()
      const orders: Array<{ id: string; created_at: string; total_amount: number; payment_method: string; items?: Array<{ product_name: string; quantity: number; unit_price: number }> }> = data.data || []
      if (orders.length === 0) return 'Tidak ada transaksi untuk periode ini.'
      const rows = ['No,Tanggal,Produk,Qty,Harga Satuan,Subtotal,Metode Bayar']
      let no = 1
      for (const o of orders) {
        const date = new Date(o.created_at).toLocaleDateString('id-ID')
        if (o.items?.length) {
          for (const item of o.items) {
            rows.push(`${no},${date},"${item.product_name}",${item.quantity},${item.unit_price},${item.quantity * item.unit_price},${o.payment_method}`)
            no++
          }
        } else {
          rows.push(`${no},${date},-,-,-,${o.total_amount},${o.payment_method}`)
          no++
        }
      }
      const csv = rows.join('\n')
      const filename = `rekap-${filenameLabels[period] || period}-${end}.csv`
      if (typeof window !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = filename; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      return `✓ **${filename}** berhasil didownload.\n${orders.length} transaksi diexport.`
    }

    if (intent === 'check_revenue') {
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
      return `**Revenue ${labels[p]}**\n${fmt(d.totalSales || 0)} · Profit ${fmt(d.totalNetProfit || 0)} · ${d.totalOrders || 0} order`
    }
    if (intent === 'find_product') {
      const results = await searchProducts(headers, String(params.query || ''))
      if (results.length === 0) return 'Produk tidak ditemukan.'
      return results.map(p => `**${p.name}** — ${fmt(p.price)} · Stok: ${p.stock}`).join('\n')
    }
    if (intent === 'find_member') {
      const results = await searchMembers(headers, String(params.query || ''))
      if (results.length === 0) return 'Member tidak ditemukan.'
      return results.map(m => `**${m.name}** — ${m.phone || ''} · ${m.points} poin · ${fmt(m.total_purchases || 0)} total`).join('\n')
    }
    if (intent === 'low_stock_alert') {
      const res = await fetch('/api/products?limit=200', { headers })
      const data = await res.json()
      const low: Array<{ name: string; stock: number }> = (data.data || []).filter((p: { stock: number }) => p.stock <= 5)
      if (low.length === 0) return 'Semua produk stoknya aman 👍'
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
      if (!name || price <= 0) {
        onMessage('Lengkapi dulu: nama produk, harga, dan stok.')
        return
      }
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
      try {
        const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' }) as HeadersInit
        const res = await fetch('/api/ai/order-preview', {
          method: 'POST',
          headers,
          body: JSON.stringify({ items, payment_method: paymentMethod }),
        })
        const data = await res.json()
        if (!res.ok) {
          onMessage(`Tidak bisa memproses order: ${data.error || 'coba lagi.'}`)
          return
        }
        // Store order preview in pendingAutomation with special type
        setPendingAutomation({
          intent: 'create_order',
          params: { ...data, payment_method: paymentMethod },
          resolved: { name: 'Order Baru' },
        })
      } catch {
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
        onMessage(res.ok ? `✓ ${data.message}` : `Gagal: ${data.error}`)
      } catch { onMessage('Error saat membuat produk.') }
      return
    }

    // Handle create_order
    if (automation.intent === 'create_order') {
      const orderData = automation.params as {
        items: Array<{ product_id: string; product_name: string; qty: number; unit_price: number; subtotal: number }>
        total: number
        subtotal: number
        tax_amount: number
        service_amount: number
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
              product_name: i.product_name,
              quantity: i.qty,
              unit_price: i.unit_price,
              subtotal: i.subtotal,
            })),
            total_amount: orderData.total,
            subtotal: orderData.subtotal,
            tax_amount: orderData.tax_amount,
            service_amount: orderData.service_amount,
            payment_method: orderData.payment_method,
            source: 'chat',
          })
        })
        const data = await res.json()
        if (res.ok) {
          const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
          onMessage(`✓ **Order dicatat!**\nTotal: ${fmtCurrency(orderData.total)} · Bayar: ${orderData.payment_method}\nOrder #${data.id?.slice(-6).toUpperCase() || 'OK'}`)
        } else {
          onMessage(`Gagal mencatat order: ${data.error}`)
        }
      } catch { onMessage('Error saat mencatat order.') }
      return
    }

    if (automation.isBulk && automation.bulkItems) {
      const type = intentToActionType(automation.intent)
      try {
        const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
        let successCount = 0, failCount = 0
        for (const item of automation.bulkItems) {
          const payload = buildActionPayload({ ...automation, resolved: { id: item.id, name: item.name } })
          const res = await fetch('/api/ai/action', { method: 'POST', headers, body: JSON.stringify({ type, payload }) })
          if (res.ok) successCount++; else failCount++
        }
        onMessage(failCount === 0 ? `✓ ${successCount} member berhasil diupdate` : `${successCount} berhasil, ${failCount} gagal`)
      } catch { onMessage('Error saat eksekusi bulk.') }
      return
    }

    const type = intentToActionType(automation.intent)
    const payload = buildActionPayload(automation)
    try {
      const headers = await getClientAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/ai/action', { method: 'POST', headers, body: JSON.stringify({ type, payload }) })
      const data = await res.json()
      onMessage(res.ok ? `✓ ${data.message || 'Berhasil'}` : `Gagal: ${data.error}`)
    } catch { onMessage('Error saat eksekusi.') }
  }, [pendingAutomation, onMessage])

  const cancelAutomation = useCallback(() => {
    setPendingAutomation(null)
    onMessage('Oke, dibatalin.')
  }, [onMessage])

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
