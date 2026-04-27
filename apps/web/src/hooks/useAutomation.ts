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
    const readIntents = ['check_revenue', 'find_product', 'find_member', 'low_stock_alert']
    if (readIntents.includes(intent)) {
      const result = await fetchReadIntent(intent, params)
      onMessage(result)
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
