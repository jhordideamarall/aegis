'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  buildBusinessAppUrl,
  buildTenantAuthBridgeUrl,
  extractTenantSubdomain,
  isLocalLikeHost,
  isMainAppHost,
  normalizeSubdomain,
  stripPort
} from '@/lib/tenant'

const TENANT_BRIDGE_STORAGE_KEY = 'aegis-tenant-bridge-at'
const TENANT_BRIDGE_GRACE_MS = 15000
const SESSION_RETRY_ATTEMPTS = 5
const SESSION_RETRY_DELAY_MS = 250

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface Business {
  id: string
  business_name: string
  subdomain: string
  slug: string
  industry: string
  status: string
  email: string
  phone: string
  pic_name?: string
  address: string
  city: string
  logo_url?: string
  settings: Record<string, any>
}

interface AuthState {
  user: { id: string; email: string } | null
  business: Business | null
  role: string | null
  loading: boolean
  authenticated: boolean
}

let cachedUser: AuthState['user'] = null
let cachedBusiness: Business | null = null
let cachedRole: string | null = null

interface AuthResolution {
  accessToken: string | null
  refreshToken: string | null
  user: AuthState['user']
  business: Business | null
  role: string | null
  hasSession: boolean
  needsSetup: boolean
}

let pendingAuthResolution: Promise<AuthResolution> | null = null

async function resolveAuthState(): Promise<AuthResolution> {
  let {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session && typeof window !== 'undefined') {
    const currentTenantSubdomain = extractTenantSubdomain(window.location.host)
    const bridgeTimestamp = Number(sessionStorage.getItem(TENANT_BRIDGE_STORAGE_KEY) || '0')
    const shouldRetrySession =
      Boolean(currentTenantSubdomain) &&
      Number.isFinite(bridgeTimestamp) &&
      Date.now() - bridgeTimestamp < TENANT_BRIDGE_GRACE_MS

    if (shouldRetrySession) {
      for (let attempt = 0; attempt < SESSION_RETRY_ATTEMPTS; attempt += 1) {
        await wait(SESSION_RETRY_DELAY_MS)

        const {
          data: { session: retriedSession }
        } = await supabase.auth.getSession()

        if (retriedSession) {
          session = retriedSession
          break
        }
      }
    }
  }

  if (!session) {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      business: null,
      role: null,
      hasSession: false,
      needsSetup: false
    }
  }

  const user = { id: session.user.id, email: session.user.email! }
  const res = await fetch('/api/businesses/my', {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  })

  if (!res.ok) {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token || null,
      user,
      business: null,
      role: null,
      hasSession: true,
      needsSetup: true
    }
  }

  const data = await res.json()

  cachedUser = user
  cachedBusiness = data.business
  cachedRole = data.role

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || null,
    user,
    business: data.business,
    role: data.role,
    hasSession: true,
    needsSetup: false
  }
}

async function getSharedAuthResolution() {
  if (!pendingAuthResolution) {
    pendingAuthResolution = resolveAuthState().finally(() => {
      pendingAuthResolution = null
    })
  }

  return pendingAuthResolution
}

export function useAuth(requireAuth = true) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<AuthState>({
    user: cachedUser,
    business: cachedBusiness,
    role: cachedRole,
    loading: true,
    authenticated: false
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const resolution = await getSharedAuthResolution()

      if (!resolution.hasSession) {
        if (requireAuth) {
          router.push('/login')
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
        return
      }

      if (resolution.business) {
        if (requireAuth && resolution.business.subdomain && typeof window !== 'undefined') {
          const targetSubdomain = normalizeSubdomain(resolution.business.subdomain)
          const currentTenantSubdomain = extractTenantSubdomain(window.location.host)
          const nextDestination = `${pathname}${window.location.search}`
          const currentHostname = stripPort(window.location.host)
          const isRootAppHost =
            isMainAppHost(window.location.host) ||
            (isLocalLikeHost(currentHostname) && !currentTenantSubdomain)
          const bridgeTimestamp = Number(sessionStorage.getItem(TENANT_BRIDGE_STORAGE_KEY) || '0')
          const isBridgeGraceActive =
            Boolean(currentTenantSubdomain) &&
            Number.isFinite(bridgeTimestamp) &&
            Date.now() - bridgeTimestamp < TENANT_BRIDGE_GRACE_MS

          if (!isBridgeGraceActive && bridgeTimestamp) {
            sessionStorage.removeItem(TENANT_BRIDGE_STORAGE_KEY)
          }

          if (
            !isBridgeGraceActive &&
            resolution.accessToken &&
            resolution.refreshToken &&
            isRootAppHost &&
            pathname !== '/locked'
          ) {
            window.location.replace(
              buildTenantAuthBridgeUrl(
                targetSubdomain,
                resolution.accessToken,
                resolution.refreshToken,
                nextDestination,
                window.location.origin
              )
            )
            return
          }

          if (!isBridgeGraceActive && isRootAppHost && pathname !== '/locked') {
            window.location.replace(
              buildBusinessAppUrl(targetSubdomain, nextDestination, window.location.origin)
            )
            return
          }
        }

        if (requireAuth && resolution.business.status === 'suspended') {
          if (pathname !== '/locked') {
            router.push('/locked')
            return
          }
        }

        setState({
          user: resolution.user,
          business: resolution.business,
          role: resolution.role,
          loading: false,
          authenticated: true
        })
      } else {
        if (requireAuth && resolution.needsSetup) {
          router.push('/setup')
        } else {
          setState(prev => ({
            ...prev,
            user: resolution.user,
            role: resolution.role,
            loading: false,
            authenticated: true
          }))
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    cachedUser = null
    cachedBusiness = null
    cachedRole = null
    pendingAuthResolution = null

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(TENANT_BRIDGE_STORAGE_KEY)
      window.location.assign('/login')
      return
    }

    router.push('/login')
  }

  return { ...state, logout, refresh: checkAuth }
}
