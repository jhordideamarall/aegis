export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Escape special ILIKE wildcard characters to prevent wildcard injection
 * PostgreSQL ILIKE treats % and _ as wildcards:
 * - % matches any sequence of characters
 * - _ matches any single character
 * This function escapes them so search is literal
 */
export function escapeILikePattern(pattern: string): string {
  return pattern.replace(/([%_])/g, '\\$1')
}

export function toLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
