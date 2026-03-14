'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBusinessDisplayName } from '@/lib/businessBranding'
import { useAuth } from '@/hooks/useAuth'
import { generateReportHtml, type ReportOrder } from '@/lib/reporting'
import { supabase } from '@/lib/supabase'

export default function OrdersReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { business, loading } = useAuth()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [reportHtml, setReportHtml] = useState('')
  const [reportLoading, setReportLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && business) {
      void loadReport()
    }
  }, [loading, business, searchParams])

  const loadReport = async () => {
    if (!business) return

    setReportLoading(true)
    setError('')

    try {
      const reportUrl = new URL('/api/orders/report', window.location.origin)
      reportUrl.searchParams.set('business_id', business.id)

      const filter = searchParams.get('filter') || 'all'
      const paymentMethod = searchParams.get('payment_method') || 'all'
      const q = searchParams.get('q') || ''
      const startDate = searchParams.get('startDate') || ''
      const endDate = searchParams.get('endDate') || ''

      if (filter === 'today' || filter === 'week' || filter === 'custom') {
        if (startDate) reportUrl.searchParams.set('startDate', startDate)
        if (endDate) reportUrl.searchParams.set('endDate', endDate)
      }

      if (paymentMethod !== 'all') {
        reportUrl.searchParams.set('payment_method', paymentMethod)
      }

      if (q) {
        reportUrl.searchParams.set('q', q)
      }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${reportUrl.pathname}${reportUrl.search}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch report data (${res.status})`)
      }

      const result = await res.json()
      const orders = (result.data || []) as ReportOrder[]

      const filterLabel = searchParams.get('filterLabel') || 'All Orders'

      setReportHtml(
        generateReportHtml(
          {
            businessName: business.business_name,
            businessAddress: business.address,
            businessPhone: business.phone,
            businessEmail: business.email,
            reportTitle: 'Sales & Payment Audit Report',
            filterLabel,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            generatedAt: new Date().toISOString(),
            searchQuery: q || undefined
          },
          orders
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare report')
    } finally {
      setReportLoading(false)
    }
  }

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.focus()
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {getBusinessDisplayName(business?.business_name)} Report
            </h1>
            <p className="text-sm text-gray-500">Print atau simpan sebagai PDF langsung dari halaman ini.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/orders${window.location.search}`)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Orders
            </button>
            <button
              onClick={handlePrint}
              disabled={reportLoading || !!error}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {reportLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            Menyiapkan report profesional...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-700">
            {error}
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Sales Report Preview"
            srcDoc={reportHtml}
            className="h-[calc(100vh-140px)] w-full rounded-2xl border border-gray-200 bg-white shadow-sm"
          />
        )}
      </div>
    </div>
  )
}
