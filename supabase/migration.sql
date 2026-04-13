-- ==========================================================
-- Run this SQL in your Supabase SQL Editor (supabase.com → SQL)
-- This creates the cloud tables that mirror local SQLite.
-- ==========================================================

-- Card progress (SM-2 state per user per card)
CREATE TABLE IF NOT EXISTS card_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_date TEXT NOT NULL,
  last_review_date TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);

-- Daily review stats per user
CREATE TABLE IF NOT EXISTS daily_stats (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  cards_correct INTEGER NOT NULL DEFAULT 0,
  new_cards_seen INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Quiz results per user
CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id, date);

-- Row Level Security: users can only access their own data
ALTER TABLE card_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their card_progress"
  ON card_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their daily_stats"
  ON daily_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their quiz_results"
  ON quiz_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
