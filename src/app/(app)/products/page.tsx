'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { formatIDR } from '@/lib/utils'
import { Product } from '@/lib/types'
import Modal from '@/components/Modal'
import { ChevronLeft, ChevronRight } from 'react-feather'

// Helper functions for price formatting
function formatPriceInput(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function parsePriceInput(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, '')) || 0
}

export default function ProductsPage() {
  const { business, loading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [fetching, setFetching] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const isLoading = loading || fetching

  useEffect(() => {
    if (!loading && business) {
      fetchProducts()
    }
  }, [loading, business, searchQuery, selectedCategory, page])

  const fetchProducts = async () => {
    if (!business) return
    try {
      const cacheKey = `products:${business.id}:${searchQuery}:${selectedCategory}:${page}`
      const cached = getClientCache<{ data: Product[]; total: number }>(cacheKey)
      if (cached) {
        setProducts(cached.data)
        setTotal(cached.total)
        setFetching(false)
      } else {
        setFetching(true)
      }

      const params = new URLSearchParams({
        business_id: business.id,
        page: String(page),
        limit: String(limit)
      })
      if (searchQuery) params.set('q', searchQuery)
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory)

      const res = await fetch(`/api/products?${params.toString()}`, {
        headers: await getClientAuthHeaders()
      })
      if (res.ok) {
        const result = await res.json()
        setProducts(result.data || [])
        setTotal(result.total || 0)
        setClientCache(cacheKey, { data: result.data || [], total: result.total || 0 })
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setFetching(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  const handleDelete = async (id: string) => {
    if (!business) {
      alert('Business not found. Please login again.')
      return
    }

    try {
      const res = await fetch(`/api/products/${id}?business_id=${business.id}`, {
        method: 'DELETE',
        headers: await getClientAuthHeaders()
      })

      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id))
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete product')
      }
    } catch (error: any) {
      alert(`Failed to delete product: ${error.message}`)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Products</h1>
          <p className="text-gray-500">Manage your product inventory</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null)
            setShowModal(true)
          }}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium flex items-center gap-2"
        >
          <span className="text-xl">+</span> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          className="w-full md:flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setPage(1)
          }}
          className="w-full md:w-auto px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
          ))}
        </select>
      </div>

      {/* Products List (Mobile) */}
      <div className="md:hidden space-y-3">
        {products.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-gray-400">
            {isLoading ? 'Loading products...' : 'No products found'}
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{formatIDR(product.price)}</p>
                  <p className={`text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setEditingProduct(product)
                    setShowModal(true)
                  }}
                  className="flex-1 px-3 py-2 text-blue-600 border border-blue-200 rounded-lg text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDelete(product.id)
                  }}
                  className="flex-1 px-3 py-2 text-red-600 border border-red-200 rounded-lg text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Products Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Stock</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <div className="text-6xl mb-4">📦</div>
                  <p>No products found</p>
                  <button
                    onClick={() => {
                      setEditingProduct(null)
                      setShowModal(true)
                    }}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Add your first product
                  </button>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <p className="text-sm text-gray-500">ID: {product.id.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-blue-600">{formatIDR(product.price)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={product.stock > 0 ? 'text-gray-800' : 'text-red-500 font-medium'}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.stock > 10 ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">In Stock</span>
                    ) : product.stock > 0 ? (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Low Stock</span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">Out of Stock</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product)
                          setShowModal(true)
                        }}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          handleDelete(product.id)
                        }}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {products.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {startItem}-{endItem} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Products</p>
          <p className="text-3xl font-bold text-gray-800">{products.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">In Stock</p>
          <p className="text-3xl font-bold text-green-600">
            {products.filter(p => p.stock > 10).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Low/Out of Stock</p>
          <p className="text-3xl font-bold text-red-600">
            {products.filter(p => p.stock <= 10).length}
          </p>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <ProductFormModal
          product={editingProduct}
          businessId={business?.id || ''}
          onClose={() => {
            setShowModal(false)
            setEditingProduct(null)
          }}
          onSuccess={() => {
            fetchProducts()
            setShowModal(false)
            setEditingProduct(null)
          }}
        />
      )}
    </div>
  )
}

interface ProductFormModalProps {
  product: Product | null
  businessId: string
  onClose: () => void
  onSuccess: () => void
}

function ProductFormModal({ product, businessId, onClose, onSuccess }: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    category: product?.category || ''
  })
  const [priceInput, setPriceInput] = useState(product?.price ? formatPriceInput(product.price) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    setPriceInput(formatted)
    setFormData({ ...formData, price: parseInt(rawValue) || 0 })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...formData, business_id: businessId })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save product')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={product ? 'Edit Product' : 'Add New Product'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Kopi Latte"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Minuman"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price (IDR) *</label>
            <input
              type="text"
              value={priceInput}
              onChange={handlePriceChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 25.000"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Format: 25.000 (auto-formatted)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock *</label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 100"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock Level</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stock: Math.max(0, formData.stock - 10) })}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stock: formData.stock + 10 })}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                +10
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
          >
            {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
