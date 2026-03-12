'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { formatIDR } from '@/lib/utils'
import { Member } from '@/lib/types'
import Modal from '@/components/Modal'
import { ChevronLeft, ChevronRight } from 'react-feather'

export default function MembersPage() {
  const { business, loading } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [fetching, setFetching] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const isLoading = loading || fetching

  useEffect(() => {
    if (!loading && business) {
      fetchMembers()
    }
  }, [loading, business, searchQuery, page])

  const fetchMembers = async () => {
    if (!business) return
    try {
      const cacheKey = `members:${business.id}:${searchQuery}:${page}`
      const cached = getClientCache<{ data: Member[]; total: number }>(cacheKey)
      if (cached) {
        setMembers(cached.data)
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

      const res = await fetch(`/api/members?${params.toString()}`)
      if (res.ok) {
        const result = await res.json()
        setMembers(result.data || [])
        setTotal(result.total || 0)
        setClientCache(cacheKey, { data: result.data || [], total: result.total || 0 })
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setFetching(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return
    if (!business) return

    try {
      const res = await fetch(`/api/members/${id}?business_id=${business.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== id))
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete member')
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      alert('Failed to delete member')
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Members</h1>
                <p className="text-gray-500">Manage loyalty program members</p>
              </div>
              <button
                onClick={() => {
                  setEditingMember(null)
                  setShowModal(true)
                }}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium flex items-center gap-2"
              >
                <span className="text-xl">+</span> Add Member
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Total Members</p>
                <p className="text-3xl font-bold text-gray-800">{members.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Total Points Issued</p>
                <p className="text-3xl font-bold text-blue-600">
                  {members.reduce((sum, m) => sum + m.points, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Total Member Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatIDR(members.reduce((sum, m) => sum + m.total_purchases, 0))}
                </p>
              </div>
            </div>

            {/* Members List (Mobile) */}
            <div className="md:hidden space-y-3">
              {members.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-gray-400">
                  {isLoading ? 'Loading members...' : 'No members found'}
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{member.points.toLocaleString()} pts</p>
                        <p className="text-xs text-gray-500">{formatIDR(member.total_purchases)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          setEditingMember(member)
                          setShowModal(true)
                        }}
                        className="flex-1 px-3 py-2 text-blue-600 border border-blue-200 rounded-lg text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="flex-1 px-3 py-2 text-red-600 border border-red-200 rounded-lg text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Members Table (Desktop) */}
            <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Member</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Points</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Purchases</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Joined</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Loading members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="text-6xl mb-4">⭐</div>
                    <p>No members found</p>
                    <button
                      onClick={() => {
                        setEditingMember(null)
                        setShowModal(true)
                      }}
                      className="mt-4 text-blue-600 hover:underline"
                    >
                      Add your first member
                    </button>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{member.name}</p>
                        <p className="text-sm text-gray-500">ID: {member.id.slice(0, 8)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-800">{member.phone}</p>
                        {member.email && (
                          <p className="text-sm text-gray-500">{member.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⭐</span>
                        <span className="font-bold text-blue-600">{member.points.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-green-600">
                        {formatIDR(member.total_purchases)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">
                        {new Date(member.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingMember(member)
                            setShowModal(true)
                          }}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
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
          {members.length > 0 && (
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
      
      {/* Add/Edit Member Modal */}
      {showModal && (
        <MemberFormModal
          member={editingMember}
          businessId={business?.id || ''}
          onClose={() => {
            setShowModal(false)
            setEditingMember(null)
          }}
          onSuccess={() => {
            fetchMembers()
            setShowModal(false)
            setEditingMember(null)
          }}
        />
      )}
    </div>
  )
}

interface MemberFormModalProps {
  member: Member | null
  businessId: string
  onClose: () => void
  onSuccess: () => void
}

function MemberFormModal({ member, businessId, onClose, onSuccess }: MemberFormModalProps) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    email: member?.email || '',
    points: member?.points || 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = member ? `/api/members/${member.id}` : '/api/members'
      const method = member ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, business_id: businessId })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save member')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to save member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={member ? 'Edit Member' : 'Add New Member'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Ahmad Rizki"
              required
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="08xxxxxxxxxx"
              pattern="08[0-9]{8,11}"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Format: 08xxxxxxxxxx (Indonesian phone)</p>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ahmad@email.com"
            />
          </div>

          {member && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Purchases</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                  {formatIDR(member.total_purchases)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Cannot be edited manually</p>
              </div>
            </>
          )}
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
            {loading ? 'Saving...' : member ? 'Update Member' : 'Create Member'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
