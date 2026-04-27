export interface PricingConfig {
  taxEnabled: boolean
  taxRate: number
  serviceEnabled: boolean
  serviceRate: number
  pointsEnabled: boolean
  redeemRate: number
  minRedeem: number
}

export interface PricingResult {
  pointsDiscount: number
  taxableBase: number
  taxAmount: number
  serviceAmount: number
  finalTotal: number
  optimalRedeem: number
}

export function calculateOrderTotal(
  subtotal: number,
  pointsUsed: number,
  availablePoints: number,
  config: PricingConfig
): PricingResult {
  const redeemable = config.pointsEnabled && availablePoints >= config.minRedeem
  const maxRedeemable = redeemable ? availablePoints : 0
  const optimalRedeem = Math.min(Math.floor(subtotal / config.redeemRate), maxRedeemable)
  const pointsDiscount = pointsUsed > 0 ? Math.min(pointsUsed * config.redeemRate, subtotal) : 0
  const taxableBase = Math.max(subtotal - pointsDiscount, 0)
  const taxAmount = config.taxEnabled ? Math.round((taxableBase * config.taxRate) / 100) : 0
  const serviceAmount = config.serviceEnabled ? Math.round((taxableBase * config.serviceRate) / 100) : 0
  const finalTotal = taxableBase + taxAmount + serviceAmount
  return { pointsDiscount, taxableBase, taxAmount, serviceAmount, finalTotal, optimalRedeem }
}

export function calculatePointsEarned(finalTotal: number, earnRate: number): number {
  return Math.floor(finalTotal / earnRate)
}
