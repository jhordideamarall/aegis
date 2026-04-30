import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { extractKeyFactsFromMessages, updateConversationSummary, upsertMemories } from '@/lib/ai-memory'

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, businessId } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    // Extract key facts from messages
    const extractedFacts = extractKeyFactsFromMessages(messages)
    
    if (extractedFacts.length > 0) {
      const memories = extractedFacts
        .filter(f => f.memory_type && f.key_name && f.content)
        .map(fact => ({
          user_id: user.id,
          memory_type: fact.memory_type!,
          key_name: fact.key_name!,
          content: fact.content!,
          importance: fact.importance || 'medium'
        }))
      
      if (memories.length > 0) {
        await upsertMemories(memories)
      }
    }

    // Update conversation summary
    const topics = extractTopics(messages)
    const summary = buildSummary(messages, topics)
    
    await updateConversationSummary(
      user.id,
      summary,
      topics,
      messages.length
    )

    return NextResponse.json({ 
      success: true, 
      factsExtracted: extractedFacts.length 
    })

  } catch (error) {
    console.error('Error updating memory:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function extractTopics(messages: { role: string; content: string }[]): { topic: string; count: number }[] {
  const topicKeywords: Record<string, string[]> = {
    revenue: ['revenue', 'pendapatan', 'penjualan', 'uang'],
    produk: ['produk', 'barang', 'stok', 'inventory'],
    member: ['member', 'pelanggan', 'customer', 'memberi'],
    order: ['order', 'transaksi', 'pesanan']
  }

  const topicCounts: Record<string, number> = {
    revenue: 0,
    produk: 0,
    member: 0,
    order: 0
  }

  for (const msg of messages) {
    const lower = msg.content.toLowerCase()
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => lower.includes(kw))) {
        topicCounts[topic]++
      }
    }
  }

  return Object.entries(topicCounts)
    .filter(([_, count]) => count > 0)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
}

function buildSummary(messages: { role: string; content: string }[], topics: { topic: string; count: number }[]): string {
  const topicNames: Record<string, string> = {
    revenue: 'keuangan',
    produk: 'produk',
    member: 'pelanggan',
    order: 'pesanan'
  }

  const topTopics = topics.slice(0, 3).map(t => topicNames[t.topic] || t.topic).join(', ')
  
  if (!topTopics) {
    return 'Percakapan umum tentang bisnis'
  }

  return `User sering bertanya tentang ${topTopics}`
}