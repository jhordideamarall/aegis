import { getSiteUrl } from '@/lib/site'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1'])

function getSiteUrlObject() {
  return new URL(getSiteUrl())
}

function normalizePath(path: string) {
  if (!path) return '/pos'
  return path.startsWith('/') ? path : `/${path}`
}

function getPortSuffix(port: string) {
  return port ? `:${port}` : ''
}

export function normalizeSubdomain(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

export function stripPort(host: string) {
  return host.replace(/:\d+$/, '').toLowerCase()
}

export function getMainAppHost() {
  return getSiteUrlObject().host.toLowerCase()
}

export function getMainAppHostname() {
  return getSiteUrlObject().hostname.toLowerCase()
}

export function isMainAppHost(host: string) {
  const hostname = stripPort(host)
  return hostname === getMainAppHostname()
}

export function isLocalLikeHost(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')
}

export function extractTenantSubdomain(host: string) {
  const hostname = stripPort(host)
  const mainHostname = getMainAppHostname()

  if (hostname.endsWith('.localhost')) {
    const subdomain = hostname.slice(0, -'.localhost'.length)
    if (!subdomain || subdomain.includes('.')) {
      return null
    }
    return normalizeSubdomain(subdomain)
  }

  if (!hostname.endsWith(`.${mainHostname}`)) {
    return null
  }

  const subdomain = hostname.slice(0, -(`.${mainHostname}`.length))

  if (!subdomain || subdomain.includes('.')) {
    return null
  }

  return normalizeSubdomain(subdomain)
}

export function isTenantHost(host: string) {
  return Boolean(extractTenantSubdomain(host))
}

export function buildBusinessAppUrl(
  subdomain: string,
  path = '/pos',
  currentOrigin?: string
) {
  const normalizedSubdomain = normalizeSubdomain(subdomain)
  const normalizedPath = normalizePath(path)

  if (currentOrigin) {
    try {
      const current = new URL(currentOrigin)

      if (isLocalLikeHost(current.hostname)) {
        return `${current.protocol}//${normalizedSubdomain}.localhost${getPortSuffix(current.port)}${normalizedPath}`
      }
    } catch {
      // Fall back to the public site URL if the current origin is malformed.
    }
  }

  const site = getSiteUrlObject()
  return `${site.protocol}//${normalizedSubdomain}.${site.hostname}${getPortSuffix(site.port)}${normalizedPath}`
}

export function buildTenantAuthBridgeUrl(
  subdomain: string,
  accessToken: string,
  refreshToken: string,
  nextPath = '/pos',
  currentOrigin?: string
) {
  const baseUrl = buildBusinessAppUrl(subdomain, '/auth/bridge', currentOrigin)
  const url = new URL(baseUrl)

  url.hash = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
    next: normalizePath(nextPath)
  }).toString()

  return url.toString()
}
