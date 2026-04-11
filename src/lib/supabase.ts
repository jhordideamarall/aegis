import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client untuk browser (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client dengan service role (bypass RLS) - hanya untuk server-side
const _supabaseAdmin = typeof window === 'undefined'
  ? (supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
      : createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }))
  : null

export const supabaseAdmin = _supabaseAdmin as SupabaseClient

/**
 * Get server-side Supabase client
 * Throws error if called from browser
 */
export function getServerSupabase(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin can only be used server-side')
  }
  return _supabaseAdmin as SupabaseClient
}
