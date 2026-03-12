'use client'

import { CartItem } from '@/lib/types'
import { formatIDR } from '@/lib/utils'

interface CartProps {
  items: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  onClear: () => void
}

export default function Cart({ items, onUpdateQty, onRemove, onClear }: CartProps) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0)

  if (items.length === 0) {
    return (<div className="bg-white rounded-lg border border-gray-200 p-6 text-center"><p className="text-gray-500">Cart is empty</p><p className="text-sm text-gray-400 mt-2">Add products to start a transaction</p></div>)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-lg">Current Order</h2>
        <button onClick={onClear} className="text-sm text-red-500 hover:text-red-700">Clear All</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <div key={item.product.id} className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <div className="flex-1">
              <p className="font-medium text-gray-800">{item.product.name}</p>
              <p className="text-sm text-gray-500">{formatIDR(item.product.price)} × {item.qty}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onUpdateQty(item.product.id, item.qty - 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">-</button>
              <span className="w-8 text-center font-medium">{item.qty}</span>
              <button onClick={() => onUpdateQty(item.product.id, item.qty + 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">+</button>
            </div>
            <button onClick={() => onRemove(item.product.id)} className="text-red-500 hover:text-red-700 p-1">×</button>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-medium">Total</span>
          <span className="text-2xl font-bold text-blue-600">{formatIDR(total)}</span>
        </div>
      </div>
    </div>
  )
}
