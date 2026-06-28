-- ============================================================
-- CAREER LAYER — PHASE 2 SCHEMA MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.achievements (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name   TEXT NOT NULL,
  tier        TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed predefined achievements
INSERT INTO public.achievements (id, name, description, icon_name, tier) VALUES
('first_blood', 'First Blood', 'Log your first victory on the global ledger.', 'Sword', 'bronze'),
('10_streak', 'Unstoppable', 'Achieve a 10-game win streak.', 'Flame', 'gold'),
('giant_slayer', 'Giant Slayer', 'Defeat an operator with a USR 200+ points higher than your own.', 'ShieldAlert', 'platinum'),
('polymath', 'Polymath', 'Establish a rating in all 5 combat disciplines.', 'BrainCircuit', 'diamond'),
('redemption', 'Redemption', 'Break a Nemesis hold by defeating an operator who had you pinned.', 'BrokenHeart', 'silver')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read achievements"
  ON public.achievements FOR SELECT
  USING (true);

-- 2. USER ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own achievements"
  ON public.user_achievements FOR SELECT
  USING (true); -- Publicly visible on profiles

CREATE POLICY "System can insert achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. SEASON PROGRESSION
-- We will use circuit_points for the season track, so no new columns are strictly needed.
-- However, we should add an event type for 'achievement_unlocked' and 'promotion' to notifications/activity feed.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'challenge_received',
    'rank_overtaken',
    'dog_tag_at_risk',
    'tournament_starting',
    'weekly_track_beaten',
    'daily_op_complete',
    'streak_reminder',
    'achievement_unlocked',
    'promotion'
  ));

-- ============================================================
-- END OF MIGRATION
-- ============================================================
