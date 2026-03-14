import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

interface AuthenticatedUser {
  id: string
  email: string
}

interface BusinessContext {
  user: AuthenticatedUser
  businessId: string
  role: string | null
}

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error('Server misconfigured')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export function getBearerToken(request: Request): string {
  const authHeader = request.headers.get('authorization') || ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
}

export async function getAuthenticatedUserFromRequest(request: Request): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request)

  if (!token) {
    return null
  }

  const supabase = getSupabaseAuthClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user?.email) {
    return null
  }

  return {
    id: user.id,
    email: user.email
  }
}

export async function getBusinessContextFromRequest(request: Request): Promise<BusinessContext | null> {
  const user = await getAuthenticatedUserFromRequest(request)

  if (!user) {
    return null
  }

  const { data: businessUser, error } = await supabaseAdmin
    .from('business_users')
    .select('business_id, role')
    .eq('user_id', user.id)
    .single()

  if (error || !businessUser) {
    return null
  }

  return {
    user,
    businessId: businessUser.business_id,
    role: businessUser.role || null
  }
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}
