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
// WARNING: Throw error di production jika service key missing
if (!supabaseServiceKey && process.env.NODE_ENV === 'production') {
  console.error(
    '⚠️ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing! ' +
    'Server-side operations will fail. ' +
    'Add this to Vercel Environment Variables immediately.'
  )
  // Temporary: Don't throw, but app will have limited functionality
  // Remove this fallback once env var is properly configured
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
