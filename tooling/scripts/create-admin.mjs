import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile(path.resolve(__dirname, '../.env.local'))

const email = process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS?.split(',')[0]
const password = process.env.ADMIN_PASSWORD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !password) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD.')
  process.exit(1)
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true
})

if (error) {
  if (error.message?.includes('already') || error.message?.includes('exists')) {
    console.log(`Admin user already exists for ${email}.`)
    process.exit(0)
  }
  console.error('Failed to create admin user:', error.message)
  process.exit(1)
}

console.log(`Admin user created: ${data.user?.id || 'unknown'} (${email})`)
