'use client'

import { Product } from '@/lib/types'
import { formatIDR } from '@/lib/utils'
import { Package, Plus } from 'lucide-react'

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
      className={`group min-w-0 overflow-hidden border bg-white text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2
        flex flex-col rounded-2xl
        md:flex-row md:items-center md:h-[68px] md:rounded-xl
        xl:flex-col xl:items-stretch xl:h-auto xl:rounded-2xl
        ${isOutOfStock
          ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60 grayscale'
          : 'cursor-pointer border-slate-200 hover:border-slate-300 hover:shadow-md active:scale-[0.98]'
        }`}
    >
      {/* Image */}
      <div className="w-full aspect-square shrink-0 overflow-hidden bg-slate-50 border-b border-slate-100
        md:w-[68px] md:h-[68px] md:aspect-auto md:border-b-0 md:border-r md:rounded-l-xl
        xl:w-full xl:h-auto xl:aspect-square xl:border-b xl:border-r-0 xl:rounded-none">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-8 w-8 text-slate-200" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="min-w-0 px-3 pt-3 pb-2
        md:flex-1 md:py-0
        xl:flex-none xl:pt-3 xl:pb-2">
        <h3 className="line-clamp-2 break-words text-sm font-black leading-snug text-slate-900
          md:line-clamp-1 xl:line-clamp-2"
          title={product.name}>
          {product.name}
        </h3>
        {/* Inline price — list view only */}
        <p className="hidden md:block xl:hidden text-[11px] font-black tabular-nums text-slate-500 mt-0.5">
          {formatIDR(product.price)}
        </p>
      </div>

      {/* Price + Stock — card view (mobile & xl+) */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-slate-100 px-3 pb-3 pt-2
        md:hidden xl:grid">
        <span className="min-w-0 whitespace-nowrap text-sm font-black tabular-nums text-slate-900">
          {formatIDR(product.price)}
        </span>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[9px] font-black tabular-nums ${
          isOutOfStock ? 'bg-slate-200 text-slate-600'
            : product.stock <= 5 ? 'bg-rose-50 text-rose-600'
            : 'bg-emerald-50 text-emerald-700'
        }`}>
          {isOutOfStock ? 'Habis' : product.stock.toLocaleString('id-ID')}
        </span>
      </div>

      {/* Stock + Add — list view only (md → xl) */}
      <div className="hidden md:flex xl:hidden items-center pr-3 shrink-0 gap-2">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-[9px] font-black tabular-nums ${
          isOutOfStock ? 'bg-slate-100 text-slate-400'
            : product.stock <= 5 ? 'bg-rose-50 text-rose-500'
            : 'bg-emerald-50 text-emerald-600'
        }`}>
          {isOutOfStock ? '–' : product.stock.toLocaleString('id-ID')}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isOutOfStock ? 'bg-slate-100' : 'bg-slate-900 group-hover:bg-slate-700'
        }`}>
          <Plus className={`w-4 h-4 ${isOutOfStock ? 'text-slate-300' : 'text-white'}`} />
        </div>
      </div>
    </button>
  )
}
