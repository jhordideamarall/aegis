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
// Check hanya di server, jangan include di client bundle
export const supabaseAdmin = typeof window === 'undefined'
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
  : null // Don't create server client in browser
