'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Business {
  id: string
  business_name: string
  subdomain: string
  slug: string
  industry: string
  status: string
  email: string
  phone: string
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
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        if (requireAuth) {
          router.push('/login')
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
        return
      }

      const user = { id: session.user.id, email: session.user.email! }

      // Fetch business info
      const res = await fetch(`/api/businesses/my?user_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()

        cachedUser = user
        cachedBusiness = data.business
        cachedRole = data.role

        if (requireAuth && data.business?.status === 'suspended') {
          if (pathname !== '/locked') {
            router.push('/locked')
            return
          }
        }

        setState({
          user,
          business: data.business,
          role: data.role,
          loading: false,
          authenticated: true
        })
      } else {
        if (requireAuth) {
          router.push('/setup')
        } else {
          setState(prev => ({ ...prev, user, loading: false, authenticated: true }))
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
    router.push('/login')
  }

  return { ...state, logout, refresh: checkAuth }
}
