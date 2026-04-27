'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Member } from '@/lib/types'
import { getClientAuthHeaders } from '@/lib/clientAuth'

interface MemberComboboxProps {
  businessId: string
  selectedMember: Member | null
  onSelect: (member: Member | null) => void
  onCreateNew: () => void
}

export function MemberCombobox({
  businessId,
  selectedMember,
  onSelect,
  onCreateNew,
}: MemberComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [members, setMembers] = React.useState<Member[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          business_id: businessId,
          page: '1',
          limit: '20'
        })
        if (searchQuery.length >= 2) {
          params.append('q', searchQuery)
        }
        
        const res = await fetch(`/api/members?${params.toString()}`, {
          headers: await getClientAuthHeaders()
        })
        if (!res.ok) throw new Error(`Failed to fetch members`)
        const data = await res.json()
        setMembers(data.data || [])
      } catch (error) {
        console.error('Error searching members:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, businessId, open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger 
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between mt-2"
          />
        }
      >
        {selectedMember ? selectedMember.name : "Select a member..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by name or phone..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Searching..." : "No member found."}
            </CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.id}
                  onSelect={() => {
                    onSelect(member.id === selectedMember?.id ? null : member)
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedMember?.id === member.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.phone} • {member.points} pts</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  onCreateNew()
                }}
                className="text-blue-600 font-medium cursor-pointer"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create new member
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}