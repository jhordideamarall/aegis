import type { Product } from './types'

export function filterProducts(products: Product[], category: string, query: string): Product[] {
  return products.filter(
    (p) =>
      (category === 'all' || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase())
  )
}

export function getProductCategories(products: Product[]): string[] {
  return ['all', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))]
}
