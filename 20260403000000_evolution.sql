-- Evolution to Multi-Discipline Gaming Engine
-- Phase 1: Universal Skill Rating & Genre Stats

-- 1. Update Profiles for Multi-Genre Tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS usr INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS genre_ratings JSONB DEFAULT '{}'::jsonb;

-- 2. Update Match History for Genre-Specific Data
ALTER TABLE match_history
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT 'Shooter',
ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS mmr_change INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mmr_after INTEGER DEFAULT 1200;

-- 3. Automated Cycling Tournaments (ACT) System
CREATE TABLE IF NOT EXISTS tournament_blueprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    genre TEXT NOT NULL,
    game TEXT NOT NULL,
    frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    max_participants INTEGER DEFAULT 32,
    prize_pool_points INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Airtight Match Logging Transaction (RPC)
-- This ensures profile ratings and match history are updated atomically
CREATE OR REPLACE FUNCTION log_match_transaction(
    p_user_id UUID,
    p_match_data JSONB,
    p_mmr_change INTEGER,
    p_new_mmr INTEGER,
    p_genre_ratings JSONB,
    p_new_usr INTEGER
) RETURNS VOID AS $$
DECLARE
    v_game TEXT := p_match_data->>'game';
    v_genre TEXT := p_match_data->>'genre';
    v_result TEXT := p_match_data->>'result';
    v_stats JSONB := p_match_data->'stats';
    v_challenge_id UUID := (p_match_data->>'challengeId')::UUID;
BEGIN
    -- 1. Insert Match History
    INSERT INTO match_history (user_id, game, genre, result, stats, mmr_change, mmr_after)
    VALUES (p_user_id, v_game, v_genre, v_result, v_stats, p_mmr_change, p_new_mmr);

    -- 2. Update Profile Ratings
    UPDATE profiles 
    SET 
        usr = p_new_usr,
        genre_ratings = p_genre_ratings,
        mmr = p_new_mmr,
        wins = wins + (CASE WHEN v_result = 'Win' THEN 1 ELSE 0 END),
        losses = losses + (CASE WHEN v_result = 'Win' THEN 0 ELSE 1 END),
        current_streak = (CASE WHEN v_result = 'Win' THEN current_streak + 1 ELSE 0 END),
        last_active = NOW(),
        win_rate = CASE 
            WHEN (wins + losses + 1) > 0 
            THEN ROUND(((wins + (CASE WHEN v_result = 'Win' THEN 1 ELSE 0 END))::FLOAT / (wins + losses + 1)) * 100)
            ELSE 0
        END
    WHERE id = p_user_id;

    -- 3. Close Challenge if applicable
    IF v_challenge_id IS NOT NULL THEN
        UPDATE challenges 
        SET status = 'completed', completed_at = NOW()
        WHERE id = v_challenge_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 2: Circuits & Tournaments Schema Refinement
ALTER TABLE circuits 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

ALTER TABLE circuits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming';
