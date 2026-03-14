import { NextResponse, type NextRequest } from 'next/server'
import { extractTenantSubdomain } from '@/lib/tenant'

export function middleware(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const tenantSubdomain = extractTenantSubdomain(host)

  if (!tenantSubdomain) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()

  if (url.pathname === '/') {
    url.pathname = '/pos'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico|img|site.webmanifest).*)'
  ]
}
