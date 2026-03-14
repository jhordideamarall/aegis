'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TENANT_BRIDGE_STORAGE_KEY = 'aegis-tenant-bridge-at'

function normalizeNextPath(path: string | null) {
  if (!path) return '/pos'
  return path.startsWith('/') ? path : `/${path}`
}

export default function TenantAuthBridgePage() {
  const [message, setMessage] = useState('Menyiapkan akses tenant...')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const hydrateTenantSession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const nextPath = normalizeNextPath(hashParams.get('next'))

      if (!accessToken || !refreshToken) {
        if (!active) return
        setError('Session tenant tidak ditemukan. Silakan login ulang.')
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (sessionError) {
        if (!active) return
        setError(sessionError.message || 'Gagal menyiapkan session tenant.')
        return
      }

      if (!active) return

      setMessage('Session tenant siap. Mengalihkan ke sistem POS...')
      sessionStorage.setItem(TENANT_BRIDGE_STORAGE_KEY, String(Date.now()))
      window.history.replaceState({}, '', '/auth/bridge')

      // Hard redirect ensures the tenant origin reloads after session persistence
      // and avoids client-side loops while the auth store is hydrating.
      window.location.replace(nextPath)
    }

    hydrateTenantSession()

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold">
          A
        </div>
        <h1 className="text-2xl font-semibold">Menyiapkan tenant</h1>
        <p className="mt-3 text-sm text-white/70">
          {error || message}
        </p>
        {!error && (
          <div className="mx-auto mt-6 h-2 w-24 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-400" />
          </div>
        )}
      </div>
    </main>
  )
}
