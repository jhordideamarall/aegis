'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, CheckCircle, Zap, ArrowRight, Clock, AlertCircle } from 'react-feather'

interface FeatureUpdate {
  id: string
  slug: string
  title: string
  version?: string | null
  summary: string
  content: string
  highlights: string[]
  status: 'draft' | 'published'
  featured: boolean
  published_at?: string | null
  created_at: string
  created_by_email?: string | null
}

export default function UpdatesPage() {
  const router = useRouter()
  const [updates, setUpdates] = useState<FeatureUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUpdates()
  }, [])

  const fetchUpdates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/feature-updates')
      
      if (!res.ok) {
        throw new Error('Failed to fetch updates')
      }

      const data = await res.json()
      setUpdates(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching updates:', err)
      setError(err.message || 'Failed to load updates')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Belum dipublikasikan'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'Invalid date'
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading updates...</p>
        </div>
      </div>
    )
  }

  // Filter only published updates and sort properly
  const publishedUpdates = updates
    .filter(u => u.status === 'published')
    .sort((a, b) => {
      // Featured first
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      // Then by published_at descending
      return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
    })

  const featuredUpdate = publishedUpdates.find(u => u.featured) || publishedUpdates[0]
  const otherUpdates = publishedUpdates.filter(u => u.id !== featuredUpdate?.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-900 rounded-lg">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Update Fitur</h1>
              <p className="text-sm text-gray-500">Catatan rilis dan pembaruan sistem Aegis POS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {updates.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Zap size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Belum ada update</h3>
            <p className="text-gray-500 mt-2">Belum ada pengumuman update fitur yang dipublikasikan.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured Update */}
            {featuredUpdate && (
              <article className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                        <Zap size={12} />
                        {featuredUpdate.featured ? 'Featured Release' : 'Latest Release'}
                      </div>
                      <h2 className="mt-4 text-2xl md:text-3xl font-bold text-gray-900">
                        {featuredUpdate.title}
                      </h2>
                      <p className="mt-4 text-base text-gray-600 leading-relaxed">
                        {featuredUpdate.summary}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="inline-flex flex-col items-end gap-1">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
                          <Calendar size={14} />
                          {formatDate(featuredUpdate.published_at)}
                        </div>
                        {featuredUpdate.version && (
                          <span className="text-xs text-gray-500 font-mono">
                            {featuredUpdate.version}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {featuredUpdate.highlights.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Highlight Fitur</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {featuredUpdate.highlights.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
                          >
                            <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <button
                      onClick={() => router.push(`/feature-updates/${featuredUpdate.slug}`)}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                      Baca Detail Update
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </article>
            )}

            {/* Other Updates */}
            {otherUpdates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Lainnya</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {otherUpdates.map((update) => (
                    <article
                      key={update.id}
                      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-gray-300"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                              <Calendar size={12} />
                              {formatDate(update.published_at)}
                            </span>
                            {update.version && (
                              <span className="font-mono">{update.version}</span>
                            )}
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900">{update.title}</h4>
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{update.summary}</p>
                          
                          {update.highlights.length > 0 && (
                            <ul className="mt-3 space-y-1.5">
                              {update.highlights.slice(0, 2).map((item, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-gray-600">
                                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                                  <span>{item}</span>
                                </li>
                              ))}
                              {update.highlights.length > 2 && (
                                <li className="text-xs text-gray-500">
                                  +{update.highlights.length - 2} highlight lainnya
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => router.push(`/feature-updates/${update.slug}`)}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-gray-700 transition"
                        >
                          Baca detail
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
