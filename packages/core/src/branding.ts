export function getBusinessDisplayName(name?: string | null): string {
  if (!name) return 'Your Business POS'
  const trimmed = name.trim()
  if (!trimmed) return 'Your Business POS'
  if (/\bpos\b/i.test(trimmed)) return trimmed
  return `${trimmed} POS`
}

export function getBusinessInitials(name?: string | null): string {
  const safe = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
  return safe || 'BP'
}
