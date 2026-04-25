'use client'

import { Product } from '@/lib/types'
import { formatIDR } from '@/lib/utils'
import { Package } from 'lucide-react'

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0

  return (
    <button
      type="button"
      onClick={() => !isOutOfStock && onAddToCart(product)}
      disabled={isOutOfStock}
      aria-label={`${product.name}, harga ${formatIDR(product.price)}, stok ${product.stock}`}
      className={`group grid min-w-0 grid-rows-[auto_minmax(2.4rem,auto)_auto] overflow-hidden rounded-2xl border bg-white text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
        isOutOfStock
          ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60 grayscale'
          : 'cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg active:scale-[0.98]'
      }`}
    >
      <div className="aspect-square shrink-0 overflow-hidden border-b border-slate-100 bg-slate-50">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-slate-200" />
          </div>
        )}
      </div>

      <div className="min-w-0 px-3 pb-2 pt-3">
        <h3
          className="line-clamp-2 break-words text-sm font-black leading-snug text-slate-900"
          title={product.name}
        >
          {product.name}
        </h3>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-slate-100 px-3 pb-3 pt-2">
        <span className="min-w-0 whitespace-nowrap text-sm font-black tabular-nums text-slate-900">
          {formatIDR(product.price)}
        </span>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[9px] font-black tabular-nums ${
            isOutOfStock
              ? 'bg-slate-200 text-slate-600'
              : product.stock <= 5
                ? 'bg-rose-50 text-rose-600'
                : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {isOutOfStock ? 'Habis' : `Stok ${product.stock.toLocaleString('id-ID')}`}
        </span>
      </div>
    </button>
  )
}
