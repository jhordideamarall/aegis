import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientAuthHeaders } from '@/lib/clientAuth'

const getAuthHeaders = async () => {
  if (typeof window === 'undefined') return {}
  return getClientAuthHeaders()
}

export function useProducts(options?: { businessId?: string; enabled?: boolean }) {
  const { businessId, enabled = true } = options || {}
  return useQuery({
    queryKey: ['products', businessId],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const params = new URLSearchParams()
      if (businessId) params.set('business_id', businessId)
      params.set('limit', '1000')
      const res = await fetch(`/api/products?${params}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      return data.data || []
    },
    enabled: enabled && !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProduct(id: string, businessId: string) {
  return useQuery({
    queryKey: ['product', id, businessId],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/products/${id}?business_id=${businessId}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch product')
      return res.json()
    },
    enabled: !!id && !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useOrders(options?: { 
  businessId?: string
  page?: number
  startDate?: string
  endDate?: string
  paymentMethod?: string
  search?: string
  enabled?: boolean
}) {
  const { businessId, page = 1, startDate, endDate, paymentMethod, search, enabled = true } = options || {}
  return useQuery({
    queryKey: ['orders', businessId, page, startDate, endDate, paymentMethod, search],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')
      if (businessId) params.set('business_id', businessId)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (paymentMethod && paymentMethod !== 'all') params.set('payment_method', paymentMethod)
      if (search) params.set('q', search)
      const res = await fetch(`/api/orders?${params}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
    enabled: enabled && !!businessId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useOrder(id: string, businessId: string) {
  return useQuery({
    queryKey: ['order', id, businessId],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/orders/${id}?business_id=${businessId}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch order')
      return res.json()
    },
    enabled: !!id && !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMembers(options?: { businessId?: string; page?: number; search?: string; enabled?: boolean }) {
  const { businessId, page = 1, search, enabled = true } = options || {}
  return useQuery({
    queryKey: ['members', businessId, page, search],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')
      if (businessId) params.set('business_id', businessId)
      if (search) params.set('q', search)
      const res = await fetch(`/api/members?${params}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch members')
      return res.json()
    },
    enabled: enabled && !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMember(id: string, businessId: string) {
  return useQuery({
    queryKey: ['member', id, businessId],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/members/${id}?business_id=${businessId}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch member')
      return res.json()
    },
    enabled: !!id && !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDashboard(options?: { businessId?: string; startDate?: string; endDate?: string; enabled?: boolean }) {
  const { businessId, startDate, endDate, enabled = true } = options || {}
  return useQuery({
    queryKey: ['dashboard', businessId, startDate, endDate],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const params = new URLSearchParams()
      if (businessId) params.set('business_id', businessId)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/dashboard?${params}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      return res.json()
    },
    enabled: enabled && !!businessId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useSettings(businessId?: string) {
  return useQuery({
    queryKey: ['settings', businessId],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/settings?business_id=${businessId}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch settings')
      const data = await res.json()
      const settings: Record<string, string> = {}
      if (data.data) {
        data.data.forEach((s: { key: string; value: string }) => {
          settings[s.key] = s.value
        })
      }
      return settings
    },
    enabled: !!businessId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useBusiness() {
  return useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/businesses/my', { headers })
      if (!res.ok) throw new Error('Failed to fetch business')
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderData: Record<string, unknown>) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData),
      })
      if (!res.ok) throw new Error('Failed to create order')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (memberData: Record<string, unknown>) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/members', {
        method: 'POST',
        headers,
        body: JSON.stringify(memberData),
      })
      if (!res.ok) throw new Error('Failed to create member')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update product')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value, businessId }: { key: string; value: string; businessId: string }) => {
      const headers = await getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, value, business_id: businessId }),
      })
      if (!res.ok) throw new Error('Failed to update settings')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}