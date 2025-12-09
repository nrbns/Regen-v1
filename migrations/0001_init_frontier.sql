-- Migration: Initialize Frontier Table
-- Replaces file-based .cursor with durable Postgres frontier
-- Uses FOR UPDATE SKIP LOCKED for safe concurrent worker access

CREATE TABLE IF NOT EXISTS frontier (
  id bigserial PRIMARY KEY,
  url text NOT NULL UNIQUE,
  score double precision DEFAULT 0,
  state text NOT NULL DEFAULT 'queued',  -- queued | in_progress | done | error
  last_attempt timestamptz,
  attempt_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  worker_id text
);

-- Index for efficient worker claim queries (SKIP LOCKED pattern)
CREATE INDEX IF NOT EXISTS idx_frontier_state_score ON frontier(state, score DESC, id DESC);

-- Index for URL lookups
CREATE INDEX IF NOT EXISTS idx_frontier_url ON frontier(url);

-- Index for stale job detection
CREATE INDEX IF NOT EXISTS idx_frontier_stale ON frontier(state, last_attempt) 
  WHERE state = 'in_progress';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_frontier_updated_at 
  BEFORE UPDATE ON frontier 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Initial comment
COMMENT ON TABLE frontier IS 'Crawler frontier queue - replaces file-based .cursor';
COMMENT ON COLUMN frontier.state IS 'queued: ready to process, in_progress: being processed, done: completed, error: failed';
COMMENT ON COLUMN frontier.score IS 'Priority score (higher = more important)';
COMMENT ON COLUMN frontier.attempt_count IS 'Number of processing attempts';
COMMENT ON COLUMN frontier.worker_id IS 'ID of worker currently processing this item';








