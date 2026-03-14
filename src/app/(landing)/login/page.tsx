'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { buildTenantAuthBridgeUrl, extractTenantSubdomain, normalizeSubdomain } from '@/lib/tenant'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot' | 'recovery'>('login')

  useEffect(() => {
    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
    const searchParams = new URLSearchParams(window.location.search)
    const isRecoveryLink =
      window.location.search.includes('mode=recovery') ||
      hashParams.get('type') === 'recovery'

    const prefilledEmail = searchParams.get('email')

    if (prefilledEmail) {
      setEmail(prefilledEmail)
    }

    if (isRecoveryLink) {
      setMode('recovery')
      setNotice('Silakan buat password baru untuk melanjutkan.')
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('recovery')
        setError('')
        setNotice('Link reset password valid. Sekarang buat password baru.')
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    const redirectAuthenticatedUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!active || !session?.access_token) {
        return
      }

      const businessRes = await fetch('/api/businesses/my', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (!businessRes.ok || !active) {
        return
      }

      const businessData = await businessRes.json()
      const businessSubdomain = normalizeSubdomain(businessData.business?.subdomain)

      if (!businessSubdomain) {
        router.replace('/dashboard')
        return
      }

      const currentTenantSubdomain = extractTenantSubdomain(window.location.host)

      if (currentTenantSubdomain === businessSubdomain) {
        router.replace('/dashboard')
        return
      }

      const refreshToken = session.refresh_token

      if (!refreshToken) {
        router.replace('/dashboard')
        return
      }

      window.location.replace(
        buildTenantAuthBridgeUrl(
          businessSubdomain,
          session.access_token,
          refreshToken,
          '/dashboard',
          window.location.origin
        )
      )
    }

    redirectAuthenticatedUser()

    return () => {
      active = false
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const accessToken = data.session?.access_token

      if (!accessToken) {
        throw new Error('Session not found after login.')
      }

      const businessRes = await fetch('/api/businesses/my', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!businessRes.ok) {
        router.push('/dashboard')
        return
      }

      const businessData = await businessRes.json()
      const businessSubdomain = normalizeSubdomain(businessData.business?.subdomain)

      if (!businessSubdomain) {
        router.push('/dashboard')
        return
      }

      const currentTenantSubdomain = extractTenantSubdomain(window.location.host)

      if (currentTenantSubdomain === businessSubdomain) {
        router.push('/dashboard')
        return
      }

      const refreshToken = data.session?.refresh_token

      if (!refreshToken) {
        router.push('/dashboard')
        return
      }

      window.location.assign(
        buildTenantAuthBridgeUrl(
          businessSubdomain,
          accessToken,
          refreshToken,
          '/dashboard',
          window.location.origin
        )
      )
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      const redirectTo = `${window.location.origin}/login?mode=recovery`
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      })

      if (error) throw error

      setNotice('Link reset password sudah dikirim. Silakan cek email kamu.')
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim link reset password')
    } finally {
      setLoading(false)
    }
  }

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      if (recoveryPassword.length < 6) {
        throw new Error('Password baru minimal 6 karakter.')
      }

      if (recoveryPassword !== confirmRecoveryPassword) {
        throw new Error('Konfirmasi password tidak cocok.')
      }

      const { error } = await supabase.auth.updateUser({
        password: recoveryPassword
      })

      if (error) throw error

      setNotice('Password berhasil diperbarui. Kamu bisa lanjut login.')
      setRecoveryPassword('')
      setConfirmRecoveryPassword('')
      setPassword('')
      setMode('login')
      window.history.replaceState({}, '', '/login')
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="landing-nav-offset-lg flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-3xl">A</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h1>
            <p className="text-gray-600">
              {mode === 'forgot'
                ? 'Masukkan email untuk kirim link reset password'
                : mode === 'recovery'
                  ? 'Buat password baru untuk akun kamu'
                  : 'Login to your AEGIS POS account'}
            </p>
          </div>
          {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>}
          {notice && <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-lg text-sm">{notice}</div>}

          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" required />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setNotice('')
                      setMode('forgot')
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{loading ? 'Logging in...' : 'Login'}</button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setNotice('')
                  setMode('login')
                }}
                className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}

          {mode === 'recovery' && (
            <form onSubmit={handleRecoverySubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmRecoveryPassword}
                  onChange={(e) => setConfirmRecoveryPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">Don't have an account? <Link href="/setup" className="text-blue-600 hover:text-blue-700 font-semibold">Create one</Link></p>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link href="/" className="text-center text-sm text-gray-500 hover:text-gray-700">← Back to home</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
