-- ============================================
-- AEGIS POS - AI USER ISOLATION MIGRATION
-- ============================================
-- Tambah user_id ke ai_conversations untuk isolasi per-user

ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_business ON ai_conversations(user_id, business_id);

-- Drop policy lama (per-business)
DROP POLICY IF EXISTS "Users can manage their business conversations" ON ai_conversations;

-- Policy baru: per user
CREATE POLICY "Users can manage their own conversations" ON ai_conversations
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
