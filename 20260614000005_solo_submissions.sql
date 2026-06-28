-- 20260614000005_solo_submissions.sql
-- Solo Submissions Logic Update

-- 1. Update the check constraint on match_history to allow 'Solo' results
ALTER TABLE public.match_history DROP CONSTRAINT IF EXISTS match_history_result_check;
ALTER TABLE public.match_history ADD CONSTRAINT match_history_result_check CHECK (result IN ('Win', 'Loss', 'Solo'));

-- 2. Update Match Logging RPC to Support Solo Mode correctly (bypassing Win/Loss logic)
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
            losses = losses + (CASE WHEN v_result = 'Loss' THEN 1 ELSE 0 END),
            current_streak = (CASE WHEN v_result = 'Win' THEN current_streak + 1 WHEN v_result = 'Loss' THEN 0 ELSE current_streak END),
            last_active = NOW(),
            win_rate = CASE 
                WHEN (wins + losses + (CASE WHEN v_result IN ('Win', 'Loss') THEN 1 ELSE 0 END)) > 0 
                THEN ROUND(((wins + (CASE WHEN v_result = 'Win' THEN 1 ELSE 0 END))::FLOAT / (wins + losses + (CASE WHEN v_result IN ('Win', 'Loss') THEN 1 ELSE 0 END))) * 100)
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
