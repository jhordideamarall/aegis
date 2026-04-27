import type { CartItem, Product } from './types'

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.product.price * item.qty, 0)
}

export function addToCart(items: CartItem[], product: Product, qty: number = 1): CartItem[] {
  const existing = items.find((i) => i.product.id === product.id)
  if (existing) {
    return items.map((i) =>
      i.product.id === product.id ? { ...i, qty: i.qty + qty } : i
    )
  }
  return [...items, { product, qty }]
}

export function removeFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.product.id !== productId)
}

export function updateCartQty(items: CartItem[], productId: string, qty: number): CartItem[] {
  if (qty <= 0) return removeFromCart(items, productId)
  return items.map((i) => (i.product.id === productId ? { ...i, qty } : i))
}

export function clearCart(): CartItem[] {
  return []
}
