-- ai_messages + ai_conversations: sats → btc
--
-- The Phase B sats→btc migration (20260404000006) converted 26 columns across 16
-- tables but MISSED ai_messages (cost_sats, api_cost_sats, creator_markup_sats) and
-- ai_conversations (total_cost_sats). The application layer was updated to write
-- *_btc on these tables, so without this migration the AI-assistant chat insert fails
-- ("column cost_btc does not exist"). This completes Phase B for the two missed tables.
--
-- Idempotent and fresh-box-safe: each rename only fires if the legacy _sats column is
-- still present (it runs after the create/enhance migrations, which produce _sats).
-- numeric(18,8) BTC; any legacy integer-sats values are divided by 1e8.

-- The analytics view from 20260108000000 references the _sats columns; drop it first,
-- recreate in _btc at the end.
DROP VIEW IF EXISTS ai_cost_analytics CASCADE;

-- ── ai_messages ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'ai_messages'
               AND column_name = 'cost_sats') THEN
    ALTER TABLE ai_messages
      ALTER COLUMN cost_sats TYPE NUMERIC(18,8) USING COALESCE(cost_sats, 0)::numeric / 100000000.0;
    ALTER TABLE ai_messages RENAME COLUMN cost_sats TO cost_btc;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'ai_messages'
               AND column_name = 'api_cost_sats') THEN
    ALTER TABLE ai_messages
      ALTER COLUMN api_cost_sats TYPE NUMERIC(18,8) USING COALESCE(api_cost_sats, 0)::numeric / 100000000.0;
    ALTER TABLE ai_messages RENAME COLUMN api_cost_sats TO api_cost_btc;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'ai_messages'
               AND column_name = 'creator_markup_sats') THEN
    ALTER TABLE ai_messages
      ALTER COLUMN creator_markup_sats TYPE NUMERIC(18,8) USING COALESCE(creator_markup_sats, 0)::numeric / 100000000.0;
    ALTER TABLE ai_messages RENAME COLUMN creator_markup_sats TO creator_markup_btc;
  END IF;
END $$;

-- ── ai_conversations ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'ai_conversations'
               AND column_name = 'total_cost_sats') THEN
    ALTER TABLE ai_conversations
      ALTER COLUMN total_cost_sats TYPE NUMERIC(18,8) USING COALESCE(total_cost_sats, 0)::numeric / 100000000.0;
    ALTER TABLE ai_conversations RENAME COLUMN total_cost_sats TO total_cost_btc;
  END IF;
END $$;

-- ── Fix the conversation-stats trigger to read/write the _btc column ──────────
CREATE OR REPLACE FUNCTION update_ai_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET
    total_messages = total_messages + 1,
    total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
    total_cost_btc = total_cost_btc + COALESCE(NEW.cost_btc, 0),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Recreate the analytics view in _btc ──────────────────────────────────────
CREATE OR REPLACE VIEW ai_cost_analytics AS
SELECT
  a.id AS assistant_id,
  a.title AS assistant_title,
  a.user_id AS creator_id,
  COUNT(m.id) AS total_messages,
  SUM(m.tokens_used) AS total_tokens,
  SUM(m.cost_btc) AS total_cost_btc,
  SUM(m.api_cost_btc) AS total_api_cost_btc,
  SUM(m.creator_markup_btc) AS total_creator_earnings_btc,
  AVG(m.cost_btc) AS avg_cost_per_message,
  COUNT(DISTINCT c.user_id) AS unique_users
FROM ai_assistants a
LEFT JOIN ai_conversations c ON c.assistant_id = a.id
LEFT JOIN ai_messages m ON m.conversation_id = c.id AND m.role = 'assistant'
GROUP BY a.id, a.title, a.user_id;

COMMENT ON VIEW ai_cost_analytics IS 'Analytics view for AI assistant costs and earnings (BTC)';
