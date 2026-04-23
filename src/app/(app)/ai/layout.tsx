'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AILayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { business, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !business) {
      router.push('/login')
    }
  }, [loading, business, router])

  if (loading || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
