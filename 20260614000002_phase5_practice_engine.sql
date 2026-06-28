-- 20260614000002_phase5_practice_engine.sql
-- The Practice Engine: Goals, Unranked Mode, and Trend Tracking

-- 1. Match History Enhancements
ALTER TABLE public.match_history
ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usr_snapshot INTEGER;

-- 2. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_tier TEXT,
    target_usr INTEGER,
    deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own goals" ON public.goals;
CREATE POLICY "Users can read own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);

-- 3. Update Match Logging RPC to Support Practice Mode & USR Snapshot
CREATE OR REPLACE FUNCTION log_match_transaction(
    p_user_id UUID,
    p_match_data JSONB,
    p_mmr_change INTEGER,
    p_new_mmr INTEGER,
    p_genre_ratings JSONB,
    p_new_usr INTEGER,
    p_is_practice BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE
    v_game TEXT := p_match_data->>'game';
    v_genre TEXT := p_match_data->>'genre';
    v_result TEXT := p_match_data->>'result';
    v_stats JSONB := p_match_data->'stats';
    v_challenge_id UUID := (p_match_data->>'challengeId')::UUID;
BEGIN
    -- 1. Insert Match History
    INSERT INTO public.match_history (user_id, game, genre, result, stats, mmr_change, mmr_after, is_practice, usr_snapshot)
    VALUES (p_user_id, v_game, v_genre, v_result, v_stats, p_mmr_change, p_new_mmr, p_is_practice, p_new_usr);

    -- 2. Update Profile Ratings (Only if not a practice match)
    IF NOT p_is_practice THEN
        UPDATE public.profiles 
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
    END IF;

    -- 3. Close Challenge if applicable
    IF v_challenge_id IS NOT NULL THEN
        UPDATE public.challenges 
        SET status = 'completed', completed_at = NOW()
        WHERE id = v_challenge_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
