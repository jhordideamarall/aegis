import { supabaseAdmin } from '@/lib/supabase'

export interface BusinessMemory {
  id?: string
  user_id: string
  memory_type: string
  key_name: string
  content: string
  importance: string
  last_updated?: string
}

export interface ConversationSummary {
  id?: string
  user_id: string
  summary_text: string
  key_topics: { topic: string; count: number }[]
  message_count: number
  last_conversation_at?: string
}

export interface ConversationFact {
  id?: string
  user_id: string
  fact_type: string
  content: string
  source_message_id?: string
  created_at?: string
}

// Get all semantic memories for a user
export async function getSemanticMemories(userId: string): Promise<BusinessMemory[]> {
  const { data, error } = await supabaseAdmin
    .from('business_memories')
    .select('*')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('last_updated', { ascending: false })

  if (error) {
    console.error('Error fetching semantic memories:', error)
    return []
  }
  return data || []
}

// Get single memory
export async function getMemory(userId: string, keyName: string): Promise<BusinessMemory | null> {
  const { data, error } = await supabaseAdmin
    .from('business_memories')
    .select('*')
    .eq('user_id', userId)
    .eq('key_name', keyName)
    .single()

  if (error) return null
  return data
}

// Upsert semantic memory
export async function upsertMemory(memory: BusinessMemory): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('business_memories')
    .upsert({
      ...memory,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'user_id,memory_type,key_name'
    })

  return !error
}

// Batch upsert memories
export async function upsertMemories(memories: BusinessMemory[]): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('business_memories')
    .upsert(
      memories.map(m => ({
        ...m,
        last_updated: new Date().toISOString()
      })),
      { onConflict: 'user_id,memory_type,key_name' }
    )

  return !error
}

// Delete specific memory
export async function deleteMemory(userId: string, keyName: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('business_memories')
    .delete()
    .eq('user_id', userId)
    .eq('key_name', keyName)

  return !error
}

// Get conversation summary
export async function getConversationSummary(userId: string): Promise<ConversationSummary | null> {
  const { data, error } = await supabaseAdmin
    .from('conversation_summaries')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

// Update conversation summary
export async function updateConversationSummary(
  userId: string,
  summaryText: string,
  keyTopics: { topic: string; count: number }[],
  messageCount: number
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('conversation_summaries')
    .upsert({
      user_id: userId,
      summary_text: summaryText,
      key_topics: keyTopics,
      message_count: messageCount,
      last_conversation_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })

  return !error
}

// Get conversation facts
export async function getConversationFacts(userId: string): Promise<ConversationFact[]> {
  const { data, error } = await supabaseAdmin
    .from('conversation_facts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return []
  return data || []
}

// Add conversation fact
export async function addConversationFact(fact: ConversationFact): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('conversation_facts')
    .insert(fact)

  return !error
}

// Get clarification pattern
export async function getClarificationPattern(userId: string, vagueInput: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('clarification_patterns')
    .select('common_clarification')
    .eq('user_id', userId)
    .eq('vague_input', vagueInput.toLowerCase())
    .single()

  if (error) return null
  return data?.common_clarification
}

// Upsert clarification pattern
export async function upsertClarificationPattern(
  userId: string,
  vagueInput: string,
  clarification: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('clarification_patterns')
    .upsert({
      user_id: userId,
      vague_input: vagueInput.toLowerCase(),
      common_clarification: clarification,
      frequency: 1,
      last_used: new Date().toISOString()
    }, {
      onConflict: 'user_id,vague_input'
    })

  return !error
}

// Increment clarification pattern frequency
export async function incrementClarificationPattern(userId: string, vagueInput: string): Promise<boolean> {
  // First get current value
  const { data: existing } = await supabaseAdmin
    .from('clarification_patterns')
    .select('frequency')
    .eq('user_id', userId)
    .eq('vague_input', vagueInput.toLowerCase())
    .single()
  
  const newFrequency = (existing?.frequency || 0) + 1
  
  const { error } = await supabaseAdmin
    .from('clarification_patterns')
    .update({ 
      frequency: newFrequency,
      last_used: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('vague_input', vagueInput.toLowerCase())

  return !error
}

// Extract key facts from messages using simple rule-based approach
export function extractKeyFactsFromMessages(messages: { role: string; content: string }[]): Partial<BusinessMemory>[] {
  const facts: Partial<BusinessMemory>[] = []
  const businessTerms = ['revenue', 'penjualan', 'profit', 'stok', 'produk', 'member', 'pelanggan', 'transaksi', 'order']
  
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      // Extract any business metrics mentioned
      const lowerContent = msg.content.toLowerCase()
      
      // Simple keyword extraction for alerts
      if (lowerContent.includes('rendah') || lowerContent.includes('habis') || lowerContent.includes('alert')) {
        const productMatch = msg.content.match(/(\w+)\s+(rendah|habis|hampir)/i)
        if (productMatch) {
          facts.push({
            memory_type: 'alert',
            key_name: 'stock_alert',
            content: `Stok rendah terdeteksi`,
            importance: 'high'
          })
        }
      }
      
      // Check for revenue mentions
      if (lowerContent.includes('revenue') || lowerContent.includes('rp')) {
        const revenueMatch = msg.content.match(/rp\s?([\d.]+)/i)
        if (revenueMatch) {
          facts.push({
            memory_type: 'trend',
            key_name: 'revenue_current',
            content: `Revenue: Rp ${revenueMatch[1]}`,
            importance: 'high'
          })
        }
      }
    }
  }
  
  return facts
}

// Build context string from memories
export function buildMemoryContext(memories: BusinessMemory[]): string {
  if (memories.length === 0) return ''
  
  const sections: string[] = []
  
  const alerts = memories.filter(m => m.memory_type === 'alert')
  if (alerts.length > 0) {
    sections.push(`Peringatan: ${alerts.map(a => a.content).join(', ')}`)
  }
  
  const trends = memories.filter(m => m.memory_type === 'trend')
  if (trends.length > 0) {
    sections.push(`Kondisi: ${trends.map(t => t.content).join('; ')}`)
  }
  
  return sections.length > 0 ? sections.join('. ') + '.' : ''
}