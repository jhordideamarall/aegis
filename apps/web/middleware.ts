import { NextResponse, type NextRequest } from 'next/server'
import { extractTenantSubdomain } from '@/lib/tenant'
import { checkRateLimit } from '@/lib/rateLimiter'

// Rate limit configuration
const RATE_LIMITS = {
  // Auth endpoints - strict limits
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests per 15 minutes
  
  // Setup endpoints - moderate limits
  setup: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  
  // API writes (POST/PUT/DELETE) - moderate limits
  apiWrite: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  
  // API reads - generous limits
  apiRead: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  
  // Public endpoints - liberal limits
  public: { windowMs: 60 * 1000, maxRequests: 50 } // 50 requests per minute
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const method = request.method
  
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Get client identifier (IP address or fallback to path)
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `${clientIp}:${pathname}`
    
    // Determine rate limit category
    let rateLimitConfig
    
    if (pathname.includes('/auth/') || pathname.includes('/login')) {
      rateLimitConfig = RATE_LIMITS.auth
    } else if (pathname.includes('/api/setup/')) {
      rateLimitConfig = RATE_LIMITS.setup
    } else if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      rateLimitConfig = RATE_LIMITS.apiWrite
    } else {
      rateLimitConfig = RATE_LIMITS.apiRead
    }
    
    const result = checkRateLimit(rateLimitKey, rateLimitConfig)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetAt),
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000))
          }
        }
      )
    }
    
    // Add rate limit headers to successful responses
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(result.limit))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(result.resetAt))
    
    return response
  }
  
  // Tenant subdomain routing
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const tenantSubdomain = extractTenantSubdomain(host)

  if (!tenantSubdomain) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()

  if (url.pathname === '/') {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|img|site.webmanifest|pwa|sw.js).*)'
  ]
}
