'use client'

import { useState, useEffect } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { Member } from '@/lib/types'
import Modal from './Modal'

interface MemberSearchProps {
  onSelect: (member: Member) => void
  onClose: () => void
  businessId: string
}

export default function MemberSearch({ onSelect, onClose, businessId }: MemberSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2 && businessId) {
        setLoading(true)
        try {
          const params = new URLSearchParams({
            business_id: businessId,
            q: searchQuery,
            page: '1',
            limit: '20'
          })
          const res = await fetch(`/api/members?${params.toString()}`, {
            headers: await getClientAuthHeaders()
          })
          const data = await res.json()
          setMembers(data.data || [])
        } catch (error) {
          console.error('Error searching members:', error)
        } finally {
          setLoading(false)
        }
      } else if (searchQuery.length === 0 && businessId) {
        // Fetch recent members
        setLoading(true)
        try {
          const params = new URLSearchParams({
            business_id: businessId,
            page: '1',
            limit: '10'
          })
          const res = await fetch(`/api/members?${params.toString()}`, {
            headers: await getClientAuthHeaders()
          })
          const data = await res.json()
          setMembers(data.data || [])
        } catch (error) {
          console.error('Error fetching members:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setMembers([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, businessId])

  const handleSelectMember = (member: Member) => {
    onSelect(member)
    onClose()
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Select Member">
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : members.length > 0 ? (
            members.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelectMember(member)}
                className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{member.points} pts</p>
                    <p className="text-xs text-gray-400">
                      {(member.total_purchases / 100).toLocaleString('id-ID')} total
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : searchQuery.length > 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No members found</p>
              <p className="text-sm mt-1">Try different search terms</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg">⭐</p>
              <p>Start typing to search members</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
          >
            + Add New Member
          </button>
        </div>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <AddMemberForm
          businessId={businessId}
          onSuccess={(member) => {
            handleSelectMember(member)
            setShowAddForm(false)
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </Modal>
  )
}

interface AddMemberFormProps {
  businessId: string
  onSuccess: (member: Member) => void
  onCancel: () => void
}

function AddMemberForm({ businessId, onSuccess, onCancel }: AddMemberFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    points: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...formData, business_id: businessId })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add member')
      }

      const member = await res.json()
      onSuccess(member)
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">Add New Member</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="08[0-9]{8,11}"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
