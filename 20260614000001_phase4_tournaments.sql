-- 20260614000001_phase4_tournaments.sql
-- Tournaments as Appointment Viewing

-- 1. Add Winner tracking for Hall of Fame
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.profiles(id);

-- 2. Pick'em Predictions Table
CREATE TABLE IF NOT EXISTS public.tournament_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    predicted_winner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'correct', 'incorrect')),
    reward_xp INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tournament_id, user_id)
);

ALTER TABLE public.tournament_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read predictions" ON public.tournament_predictions;
CREATE POLICY "Public read predictions" ON public.tournament_predictions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can predict" ON public.tournament_predictions;
CREATE POLICY "Users can predict" ON public.tournament_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage predictions" ON public.tournament_predictions;
CREATE POLICY "Admins manage predictions" ON public.tournament_predictions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. Auto-Schedule Next Tournament RPC
CREATE OR REPLACE FUNCTION auto_schedule_next_tournament(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tour record;
    v_new_start_time TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_tour FROM public.tournaments WHERE id = p_tournament_id;
    
    IF NOT FOUND OR v_tour.auto_schedule_next = false THEN
        RETURN;
    END IF;

    -- Determine next interval based on tier
    IF v_tour.tier = 'daily' THEN
        v_new_start_time := v_tour.start_time + interval '1 day';
    ELSIF v_tour.tier = 'weekly' THEN
        v_new_start_time := v_tour.start_time + interval '1 week';
    ELSIF v_tour.tier = 'monthly' THEN
        v_new_start_time := v_tour.start_time + interval '1 month';
    ELSE
        RETURN;
    END IF;
    
    -- Clone tournament
    INSERT INTO public.tournaments (
        circuit_id, name, game, entry_type, format, best_of, status, tier,
        max_participants, scoring_rules, has_playoffs, elo_multiplier,
        auto_start_min_players, auto_schedule_next, description, prize_info,
        image_url, start_time, created_by
    ) VALUES (
        v_tour.circuit_id, v_tour.name, v_tour.game, v_tour.entry_type, v_tour.format, v_tour.best_of, 'upcoming', v_tour.tier,
        v_tour.max_participants, v_tour.scoring_rules, v_tour.has_playoffs, v_tour.elo_multiplier,
        v_tour.auto_start_min_players, true, v_tour.description, v_tour.prize_info,
        v_tour.image_url, v_new_start_time, v_tour.created_by
    );
END;
$$;
