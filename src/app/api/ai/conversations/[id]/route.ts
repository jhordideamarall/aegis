import { NextResponse } from 'next/server'
import { getBusinessContextFromRequest, unauthorizedResponse } from '@/lib/requestAuth'
import { supabaseAdmin } from '@/lib/supabase'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const businessContext = await getBusinessContextFromRequest(request)
  if (!businessContext) return unauthorizedResponse()

  const { businessId, user } = businessContext
  const { id } = await context.params

  // Verify ownership
  const { data: conversation, error: convError } = await supabaseAdmin
    .from('ai_conversations')
    .select('id')
    .eq('id', id)
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .single()

  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data: messages, error } = await supabaseAdmin
    .from('ai_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: messages || [] })
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) return unauthorizedResponse()

    const { businessId, user } = businessContext
    const { id } = await context.params
    const body = await request.json()
    const { title } = body as { title?: string }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data: conversation, error } = await supabaseAdmin
      .from('ai_conversations')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .select('id, title, updated_at')
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)
    if (!businessContext) return unauthorizedResponse()

    const { businessId, user } = businessContext
    const { id } = await context.params

    // Delete messages first (cascade may not be set)
    await supabaseAdmin
      .from('ai_messages')
      .delete()
      .eq('conversation_id', id)

    const { error } = await supabaseAdmin
      .from('ai_conversations')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 })
  }
}
