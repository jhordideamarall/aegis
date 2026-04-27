export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

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

export const DEFAULT_TIME_ZONE = 'Asia/Jakarta'

function getZonedDateParts(value: Date | string, timeZone: string = DEFAULT_TIME_ZONE) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || ''

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour')
  }
}

export function toTimeZoneISODate(value: Date | string, timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = getZonedDateParts(value, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function toTimeZoneHourKey(value: Date | string, timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = getZonedDateParts(value, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`
}
