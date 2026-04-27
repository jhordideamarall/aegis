import { getSiteUrl } from '@/lib/site'

export interface FeatureUpdateRecord {
  id: string
  slug: string
  title: string
  version?: string | null
  summary: string
  content: string
  highlights: string[]
  status: 'draft' | 'published'
  featured: boolean
  published_at?: string | null
  email_sent_at?: string | null
  email_recipient_count: number
  email_last_error?: string | null
  created_by_email?: string | null
  created_at: string
  updated_at: string
}

export function slugifyFeatureUpdate(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'feature-update'
}

export function parseHighlights(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  if (typeof input === 'string') {
    return input
      .split('\n')
      .map((item) => item.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
  }

  return []
}

export function normalizeFeatureUpdate(row: any): FeatureUpdateRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    version: row.version,
    summary: row.summary,
    content: row.content,
    highlights: parseHighlights(row.highlights),
    status: row.status === 'published' ? 'published' : 'draft',
    featured: Boolean(row.featured),
    published_at: row.published_at,
    email_sent_at: row.email_sent_at,
    email_recipient_count: Number(row.email_recipient_count || 0),
    email_last_error: row.email_last_error,
    created_by_email: row.created_by_email,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export function splitContentIntoParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export function formatFeatureUpdateDate(value?: string | null): string {
  if (!value) return 'Draft'

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function getFeatureUpdateUrl(slug: string): string {
  return `${getSiteUrl()}/updates/${slug}`
}

export function isFeatureUpdatesTableMissing(error: any): boolean {
  return error?.code === 'PGRST205' || String(error?.message || '').includes("public.feature_updates")
}

export function normalizeWhatsAppNumber(phone?: string | null): string {
  if (!phone) return ''

  let normalized = phone.replace(/\D/g, '')

  if (normalized.startsWith('0')) {
    normalized = `62${normalized.slice(1)}`
  } else if (normalized.startsWith('8')) {
    normalized = `62${normalized}`
  }

  return normalized
}

export function buildFeatureUpdateWhatsAppMessage(args: {
  businessName: string
  picName?: string | null
  updateTitle: string
  version?: string | null
  summary: string
  highlights: string[]
  updateUrl: string
}): string {
  const greetingName = args.picName?.trim() || `Tim ${args.businessName}`
  const highlights = args.highlights
    .slice(0, 5)
    .map((item) => `- ${item}`)
    .join('\n')

  return [
    `Halo ${greetingName},`,
    '',
    `Kami ingin menginformasikan update terbaru di Aegis POS${args.version ? ` ${args.version}` : ''}:`,
    `${args.updateTitle}`,
    '',
    args.summary,
    highlights ? `\nHighlight:\n${highlights}` : '',
    '',
    `Detail update bisa dilihat di sini: ${args.updateUrl}`,
    '',
    'Terima kasih.'
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
