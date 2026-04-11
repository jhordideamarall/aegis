import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client untuk browser (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client dengan service role (bypass RLS) - hanya untuk server-side
// CRITICAL: Throw error di production jika service key missing - jangan silent fallback
if (!supabaseServiceKey && process.env.NODE_ENV === 'production') {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is required in production. ' +
    'This key bypasses Row Level Security and is essential for server-side operations.'
  )
}

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createClient(supabaseUrl, supabaseAnonKey, {
      // Development fallback - tetap bedakan client, jangan reuse 'supabase' instance
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
