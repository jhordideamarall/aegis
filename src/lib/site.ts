const DEFAULT_SITE_URL = 'https://aegis.socialbrand1980.com'

export function getSiteUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    DEFAULT_SITE_URL

  return value.replace(/\/+$/, '')
}
