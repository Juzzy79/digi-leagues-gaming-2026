-- ============================================================
-- DAILY GRAVITY — PHASE 1 SCHEMA MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. CAREER XP (Phase 2 seed — add now, display immediately)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS career_xp INTEGER DEFAULT 0;

-- 2. PLAY STREAK (separate from win streak / current_streak)
--    play_streak = consecutive calendar days with at least one logged result
--    Uses AEST (UTC+10) day boundary
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS play_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_play_date DATE;

-- 3. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL
    CHECK (type IN (
      'challenge_received',
      'rank_overtaken',
      'dog_tag_at_risk',
      'tournament_starting',
      'weekly_track_beaten',
      'daily_op_complete',
      'streak_reminder'
    )),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,                        -- e.g. '/app/leaderboard'
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Any authenticated user (or SECURITY DEFINER functions) can insert
CREATE POLICY "Authenticated insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. DAILY OPS COMPLETIONS
CREATE TABLE IF NOT EXISTS public.daily_ops_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  op_key       TEXT NOT NULL,   -- e.g. 'shoot_2_results_2026-06-12'
  completed_at TIMESTAMPTZ DEFAULT now(),
  xp_awarded   INTEGER DEFAULT 0
);

ALTER TABLE public.daily_ops_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own op completions"
  ON public.daily_ops_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own op completions"
  ON public.daily_ops_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. FRIEND CONNECTIONS
CREATE TABLE IF NOT EXISTS public.friend_connections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own connections"
  ON public.friend_connections FOR ALL
  USING (auth.uid() IN (requester_id, addressee_id));

-- 6. RPC: update_play_streak
--    Called after every match result; handles AEST day boundary.
CREATE OR REPLACE FUNCTION public.update_play_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_today          DATE := (NOW() AT TIME ZONE 'Australia/Sydney')::DATE;
  v_last_play_date DATE;
  v_play_streak    INTEGER;
BEGIN
  SELECT last_play_date, play_streak
  INTO v_last_play_date, v_play_streak
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_last_play_date IS NULL THEN
    -- First ever result
    UPDATE public.profiles
    SET play_streak = 1, last_play_date = v_today
    WHERE id = p_user_id;

  ELSIF v_last_play_date = v_today THEN
    -- Already played today — no change needed
    NULL;

  ELSIF v_last_play_date = (v_today - INTERVAL '1 day')::DATE THEN
    -- Consecutive day — extend streak
    UPDATE public.profiles
    SET play_streak    = v_play_streak + 1,
        last_play_date = v_today
    WHERE id = p_user_id;

  ELSE
    -- Gap in play — reset
    UPDATE public.profiles
    SET play_streak = 1, last_play_date = v_today
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: award_career_xp
CREATE OR REPLACE FUNCTION public.award_career_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET career_xp = career_xp + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Expose new columns to existing profiles select
--    (no action needed — SELECT * will pick them up automatically)

-- ============================================================
-- END OF MIGRATION
-- ============================================================
