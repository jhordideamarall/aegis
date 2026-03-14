export const PAYMENT_PROOF_BUCKET = 'payment-proofs'

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'debit', label: 'Debit' },
  { value: 'qris', label: 'QRIS' },
  { value: 'bank_transfer', label: 'Bank Transfer' }
] as const

export const QRIS_PROVIDER_OPTIONS = [
  { value: 'general', label: 'QRIS Umum' },
  { value: 'gopay', label: 'GoPay' },
  { value: 'dana', label: 'DANA' },
  { value: 'ovo', label: 'OVO' },
  { value: 'shopeepay', label: 'ShopeePay' },
  { value: 'bank_qris', label: 'QRIS Bank' },
  { value: 'other', label: 'Lainnya' }
] as const

export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number]['value']
export type PaymentProvider = (typeof QRIS_PROVIDER_OPTIONS)[number]['value']

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((option) => [option.value, option.label])
)

const PAYMENT_PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  QRIS_PROVIDER_OPTIONS.map((option) => [option.value, option.label])
)

function fallbackLabel(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getPaymentMethodLabel(method?: string | null): string {
  if (!method) return '-'
  return PAYMENT_METHOD_LABELS[method] || fallbackLabel(method)
}

export function getPaymentProviderLabel(provider?: string | null): string {
  if (!provider) return ''
  return PAYMENT_PROVIDER_LABELS[provider] || fallbackLabel(provider)
}

export function formatPaymentDisplay(method?: string | null, provider?: string | null): string {
  const methodLabel = getPaymentMethodLabel(method)

  if (method === 'qris' && provider) {
    return `${methodLabel} • ${getPaymentProviderLabel(provider)}`
  }

  return methodLabel
}

export function paymentMethodRequiresProof(method?: string | null): boolean {
  return method === 'qris' || method === 'bank_transfer'
}

export function getPaymentMethodBadgeColor(method?: string | null): string {
  const colors: Record<string, string> = {
    cash: 'bg-green-100 text-green-700',
    debit: 'bg-blue-100 text-blue-700',
    qris: 'bg-amber-100 text-amber-700',
    bank_transfer: 'bg-indigo-100 text-indigo-700'
  }

  return colors[method || ''] || 'bg-gray-100 text-gray-700'
}

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return PAYMENT_METHOD_OPTIONS.some((option) => option.value === method)
}

export function isValidPaymentProvider(provider: string): provider is PaymentProvider {
  return QRIS_PROVIDER_OPTIONS.some((option) => option.value === provider)
}
