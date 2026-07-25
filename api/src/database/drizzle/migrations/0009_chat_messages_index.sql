-- Add composite index for chat messages cursor-based pagination
-- This prevents full-table scans when querying messages ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages (conversation_id, created_at DESC);
