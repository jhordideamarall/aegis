'use client'

import { useState, useEffect } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { Member } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Loader2, Search, UserPlus } from 'lucide-react'

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
          if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`)
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
          if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`)
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
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="pl-9"
                autoFocus
              />
            </div>

            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground h-full">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <p className="text-sm">Searching...</p>
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{member.points} pts</p>
                        <p className="text-[10px] text-muted-foreground">
                          Rp {(member.total_purchases / 100).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground h-full">
                  <p className="text-sm">No members found</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground h-full">
                  <Search className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">Start typing to search</p>
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 w-full pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => setShowAddForm(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
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
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              pattern="08[0-9]{8,11}"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g., ahmad@email.com"
            />
          </div>
          
          <div className="flex gap-2 w-full pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
