-- ============================================
-- AEGIS POS - AI CHAT PERSISTENCE MIGRATION
-- ============================================

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can manage their business conversations" ON ai_conversations
FOR ALL USING (business_id IN (
  SELECT business_id FROM business_users WHERE user_id = auth.uid()
)) WITH CHECK (business_id IN (
  SELECT business_id FROM business_users WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage their conversation messages" ON ai_messages
FOR ALL USING (conversation_id IN (
  SELECT id FROM ai_conversations WHERE business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
)) WITH CHECK (conversation_id IN (
  SELECT id FROM ai_conversations WHERE business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
));

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON ai_conversations(business_id);
