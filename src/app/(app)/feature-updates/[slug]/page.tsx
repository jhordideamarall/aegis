'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle, Zap, Clock } from 'react-feather'

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

export default function UpdateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [update, setUpdate] = useState<FeatureUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params?.slug) {
      fetchUpdate(params.slug as string)
    }
  }, [params?.slug])

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back()
    } else {
      // Fallback to updates list if no history
      router.push('/feature-updates')
    }
  }

  const fetchUpdate = async (slug: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/feature-updates`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch update')
      }

      const data = await res.json()
      const found = data.find((u: FeatureUpdate) => u.slug === slug)
      
      if (!found) {
        throw new Error('Update not found')
      }

      setUpdate(found)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching update:', err)
      setError(err.message || 'Failed to load update')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'No date'
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading update...</p>
        </div>
      </div>
    )
  }

  if (error || !update) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Zap size={24} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Update not found</h3>
          <p className="text-gray-500 mt-2 mb-4">{error || 'The requested update does not exist.'}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            Kembali ke Daftar Update
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <ArrowLeft size={16} />
            Kembali ke Daftar Update
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
              <Calendar size={14} />
              {formatDate(update.published_at)}
            </span>
            {update.version && (
              <span className="font-mono text-xs bg-gray-100 px-2.5 py-1 rounded-full">
                {update.version}
              </span>
            )}
            {update.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                <Zap size={12} />
                Featured
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{update.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary */}
        <div className="rounded-xl bg-gray-100 p-6 mb-8">
          <p className="text-lg text-gray-700 leading-relaxed">{update.summary}</p>
        </div>

        {/* Highlights */}
        {update.highlights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-600" />
              Highlight Fitur
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {update.highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
                >
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Content */}
        {update.content && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Update</h2>
            <div className="prose prose-gray max-w-none">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                {update.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
                    {paragraph.split('**').map((part, partIdx) => 
                      partIdx % 2 === 1 ? (
                        <strong key={partIdx} className="font-semibold text-gray-900">{part}</strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} />
                Published: {formatDate(update.published_at)}
              </span>
              <span>•</span>
              <span>Created by: {update.created_by_email || 'Admin'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
