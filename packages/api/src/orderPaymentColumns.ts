import { supabaseAdmin } from './supabase'

export interface OrderPaymentColumnSupport {
  provider: boolean
  notes: boolean
  proof: boolean
}

let orderPaymentColumnSupportPromise: Promise<OrderPaymentColumnSupport> | null = null

async function detectOrderPaymentColumnSupport(): Promise<OrderPaymentColumnSupport> {
  const [providerResult, notesResult, proofResult] = await Promise.all([
    supabaseAdmin.from('orders').select('payment_provider').limit(1),
    supabaseAdmin.from('orders').select('payment_notes').limit(1),
    supabaseAdmin
      .from('orders')
      .select('payment_proof_url,payment_proof_path,payment_proof_uploaded_at')
      .limit(1),
  ])

  return {
    provider: !providerResult.error,
    notes: !notesResult.error,
    proof: !proofResult.error,
  }
}

export async function getOrderPaymentColumnSupport(): Promise<OrderPaymentColumnSupport> {
  if (!orderPaymentColumnSupportPromise) {
    orderPaymentColumnSupportPromise = detectOrderPaymentColumnSupport().catch((error) => {
      orderPaymentColumnSupportPromise = null
      throw error
    })
  }

  return orderPaymentColumnSupportPromise
}
