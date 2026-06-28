-- Migration: add_genre_and_stats
-- Add columns to match_history
ALTER TABLE IF EXISTS match_history ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE IF EXISTS match_history ADD COLUMN IF NOT EXISTS stats JSONB;

-- Add columns to profiles
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS genre_ratings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS usr INTEGER DEFAULT 1200;

-- Function: log_match_transaction (Airtight atomic update)
CREATE OR REPLACE FUNCTION log_match_transaction(
  p_user_id UUID,
  p_match_data JSONB,
  p_mmr_change INTEGER,
  p_new_mmr INTEGER,
  p_genre_ratings JSONB,
  p_new_usr INTEGER
) RETURNS VOID AS $$
DECLARE
  v_is_win BOOLEAN;
BEGIN
  v_is_win := (p_match_data->>'result' = 'Win');

  -- 1. Insert match history
  INSERT INTO match_history (user_id, game, genre, result, stats, mmr_change, mmr_after)
  VALUES (
    p_user_id, 
    p_match_data->>'game', 
    p_match_data->>'genre', 
    p_match_data->>'result', 
    p_match_data->'stats', 
    p_mmr_change, 
    p_new_mmr
  );

  -- 2. Update profile
  UPDATE profiles
  SET 
    mmr = p_new_mmr,
    genre_ratings = p_genre_ratings,
    usr = p_new_usr,
    wins = wins + (CASE WHEN v_is_win THEN 1 ELSE 0 END),
    losses = losses + (CASE WHEN NOT v_is_win THEN 1 ELSE 0 END),
    current_streak = (CASE WHEN v_is_win THEN current_streak + 1 ELSE 0 END),
    win_rate = CASE 
      WHEN (wins + losses + 1) > 0 
      THEN ROUND(((wins + (CASE WHEN v_is_win THEN 1 ELSE 0 END))::FLOAT / (wins + losses + 1)) * 100)
      ELSE 0
    END
  WHERE id = p_user_id;

END;
$$ LANGUAGE plpgsql;
