import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { getSemanticMemories, getConversationSummary, getConversationFacts } from '@/lib/ai-memory'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all'

    const result: Record<string, any> = {}

    if (type === 'all' || type === 'semantic') {
      result.semanticMemories = await getSemanticMemories(user.id)
    }

    if (type === 'all' || type === 'conversation') {
      result.conversationSummary = await getConversationSummary(user.id)
      result.conversationFacts = await getConversationFacts(user.id)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching memory:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}