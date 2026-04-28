import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientAuthHeaders } from '@/lib/clientAuth'

const getAuthHeaders = async () => {
  if (typeof window === 'undefined') return {}
  return getClientAuthHeaders()
}

export function useAIChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { messages: Array<{ role: string; content: string }>; conversationId?: string; withContext?: boolean }) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('AI chat failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] })
    },
  })
}

export function useAIQuickChat() {
  return useMutation({
    mutationFn: async (payload: { prompt: string; withContext?: boolean }) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/ai/quick-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('AI quick chat failed')
      return res.json()
    },
  })
}

export function useAIAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { type: string; payload: Record<string, unknown> }) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/ai/action', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('AI action failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useAIAutomate() {
  return useMutation({
    mutationFn: async (prompt: string) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/ai/automate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) throw new Error('AI automate failed')
      return res.json()
    },
  })
}

export function useAIOrderPreview() {
  return useMutation({
    mutationFn: async (payload: { items: Array<{ product_id: string; qty: number }>; member_id?: string; business_id: string }) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/ai/order-preview', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('AI order preview failed')
      return res.json()
    },
  })
}

export function useAIConversations() {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/ai/conversations', { headers })
      if (!res.ok) throw new Error('Failed to fetch conversations')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAIConversation(id: string) {
  return useQuery({
    queryKey: ['ai', 'conversation', id],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/ai/conversations/${id}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch conversation')
      return res.json()
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAIDeleteConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Failed to delete conversation')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] })
    },
  })
}

export function useAIInsight() {
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversationId }),
      })
      if (!res.ok) throw new Error('AI insight failed')
      return res.json()
    },
  })
}