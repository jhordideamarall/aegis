import { supabaseAdmin } from './supabase'

export async function assertBusinessActive(businessId: string) {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('status')
    .eq('id', businessId)
    .single()

  if (error || !data) {
    return { ok: false, status: 404, message: 'Business not found' }
  }

  if (data.status === 'suspended') {
    return { ok: false, status: 403, message: 'Business is suspended' }
  }

  return { ok: true as const }
}
