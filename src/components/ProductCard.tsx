'use client'

import { Product } from '@/lib/types'
import { formatIDR } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0

  return (
    <button onClick={() => !isOutOfStock && onAddToCart(product)} disabled={isOutOfStock} className={`p-4 rounded-lg border-2 transition-all text-left w-full h-full flex flex-col ${isOutOfStock ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' : 'border-gray-200 bg-white hover:border-blue-500 hover:shadow-md cursor-pointer'}`}>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-2">{product.category}</p>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-lg font-bold text-blue-600">{formatIDR(product.price)}</span>
        <span className={`text-sm ${isOutOfStock ? 'text-red-500' : 'text-gray-500'}`}>{isOutOfStock ? 'Out of Stock' : `Stock: ${product.stock}`}</span>
      </div>
    </button>
  )
}
