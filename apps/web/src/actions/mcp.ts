'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'

export async function getMcpApiKey(businessId: string) {
  const { data, error } = await supabaseAdmin
    .from('mcp_api_keys')
    .select('token')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)
  return data?.[0]?.token || null
}

export async function generateMcpApiKey(businessId: string) {
  const token = `mcp_${nanoid(32)}`

  // Deactivate old keys
  await supabaseAdmin
    .from('mcp_api_keys')
    .update({ is_active: false })
    .eq('business_id', businessId)

  const { error } = await supabaseAdmin
    .from('mcp_api_keys')
    .insert([{ 
      business_id: businessId, 
      token,
      is_active: true
    }])

  if (error) throw new Error(error.message)

  revalidatePath('/ai/mcp')
  return token
}
