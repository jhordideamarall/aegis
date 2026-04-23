/**
 * Environment Variables Validation
 * Run this at app startup to ensure all required env vars are present
 */

export function validateEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`  - ${key}`))
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. ` +
      'Please check your .env.local file.'
    )
  }

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl?.startsWith('https://')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL'
    )
  }

  // Validate service role key format (should start with 'eyJ')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey?.startsWith('eyJ')) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY format looks invalid')
  }

  // Check for admin emails if in production
  if (process.env.NODE_ENV === 'production') {
    const adminEmails = process.env.ADMIN_EMAILS
    if (!adminEmails) {
      console.warn('⚠️  ADMIN_EMAILS not set in production. Admin features may not work.')
    }
  }

  console.log('✅ Environment variables validated successfully')
}
