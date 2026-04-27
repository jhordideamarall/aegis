import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const businessContext = await getBusinessContextFromRequest(request)
  if (!businessContext) return unauthorizedResponse()

  const { businessId, user } = businessContext

  const { data: conversations, error } = await supabaseAdmin
    .from('ai_conversations')
    .select('id, title, created_at, updated_at')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .neq('title', 'Aegis Command Center')
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversations: conversations || [] })
}

export async function POST(request: Request) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) return unauthorizedResponse()

    const { businessId, user } = businessContext
    const body = await request.json()
    const { firstMessage } = body as { firstMessage?: string }

    if (!firstMessage?.trim()) {
      return NextResponse.json({ error: 'firstMessage is required' }, { status: 400 })
    }

    const title = firstMessage.trim().slice(0, 40) + (firstMessage.trim().length > 40 ? '...' : '')

    const { data: conversation, error } = await supabaseAdmin
      .from('ai_conversations')
      .insert([{
        business_id: businessId,
        user_id: user.id,
        title
      }])
      .select('id, title, created_at, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}
