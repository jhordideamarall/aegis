import { supabase } from '@/lib/supabase'

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) return Object.fromEntries(headers.entries())
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return { ...headers }
}

export async function getClientAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

export async function getClientAuthHeaders(headers?: HeadersInit) {
  const accessToken = await getClientAccessToken()
  const normalized = normalizeHeaders(headers)

  if (!accessToken) {
    return normalized
  }

  return {
    ...normalized,
    Authorization: `Bearer ${accessToken}`
  }
}
