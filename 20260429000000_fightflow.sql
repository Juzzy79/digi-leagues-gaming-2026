-- ==========================================
-- FIGHTFLOW SYSTEM REBUILD
-- ==========================================

-- Clean wipe of existing tournament tables
DROP TABLE IF EXISTS public.match_reports CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.tournament_participants CASCADE;
DROP TABLE IF EXISTS public.tournament_matches CASCADE;
DROP TABLE IF EXISTS public.tournament_registrations CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;

-- 1. TOURNAMENTS
CREATE TABLE public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuit_id UUID REFERENCES public.circuits(id), -- Assuming circuits table exists
    name TEXT NOT NULL,
    game TEXT NOT NULL,
    entry_type TEXT NOT NULL DEFAULT '1v1' CHECK (entry_type IN ('1v1', 'team')),
    format TEXT NOT NULL DEFAULT 'single_elimination' CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'ffa_league')),
    best_of INTEGER NOT NULL DEFAULT 1 CHECK (best_of IN (1, 3, 5, 7)),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration', 'active', 'completed')),
    tier TEXT DEFAULT 'daily' CHECK (tier IN ('daily', 'weekly', 'monthly', 'major')),
    max_participants INTEGER DEFAULT 16,
    
    -- Scoring & Progression
    scoring_rules JSONB DEFAULT '{"win": 3, "loss": 0, "draw": 1}'::jsonb,
    has_playoffs BOOLEAN DEFAULT false,
    elo_multiplier NUMERIC(4,2) DEFAULT 1.00,
    
    -- Automation
    auto_start_min_players INTEGER,
    auto_schedule_next BOOLEAN DEFAULT false,
    
    description TEXT,
    prize_info TEXT,
    image_url TEXT,
    start_time TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admin write tournaments" ON public.tournaments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));


-- 2. TOURNAMENT PARTICIPANTS
CREATE TABLE public.tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_name TEXT, -- Included as requested for team tracking on a profile
    seed INTEGER,
    standing INTEGER,
    points INTEGER DEFAULT 0,
    tie_breaker_stats JSONB,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'withdrawn')),
    registered_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tournament_id, participant_id)
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read participants" ON public.tournament_participants FOR SELECT USING (true);
CREATE POLICY "Users can register themselves" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = participant_id);
CREATE POLICY "Admins manage participants" ON public.tournament_participants FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));


-- 3. MATCHES
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 1,
    bracket_match_id TEXT, -- e.g., 'WB-R1-M1'
    participant1_id UUID REFERENCES public.tournament_participants(id) ON DELETE SET NULL,
    participant2_id UUID REFERENCES public.tournament_participants(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES public.tournament_participants(id) ON DELETE SET NULL,
    score1 INTEGER DEFAULT 0,
    score2 INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'reported', 'completed', 'disputed')),
    auto_approve_at TIMESTAMPTZ,
    genre_stats JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));


-- 4. MATCH REPORTS
CREATE TABLE public.match_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES public.profiles(id),
    score1 INTEGER NOT NULL,
    score2 INTEGER NOT NULL,
    genre_stats JSONB,
    status TEXT DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'approved', 'rejected')),
    verified_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.match_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read match reports" ON public.match_reports FOR SELECT USING (true);
CREATE POLICY "Participants can submit reports" ON public.match_reports FOR INSERT WITH CHECK (
    auth.uid() = submitted_by
);
CREATE POLICY "Participants can verify reports" ON public.match_reports FOR UPDATE USING (
    auth.uid() IN (
        SELECT p.participant_id FROM public.tournament_participants p
        JOIN public.matches m ON m.id = match_id
        WHERE p.id IN (m.participant1_id, m.participant2_id)
    )
);
CREATE POLICY "Admins manage match reports" ON public.match_reports FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));


-- ==========================================
-- AUTOMATION FUNCTIONS & PG_CRON
-- ==========================================

-- Admin Force Rematch
CREATE OR REPLACE FUNCTION public.trigger_rematch(p_match_id UUID)
RETURNS void AS $$
BEGIN
    -- Authorization Check
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Reset match status
    UPDATE public.matches
    SET status = 'scheduled',
        score1 = 0,
        score2 = 0,
        winner_id = NULL,
        genre_stats = NULL,
        auto_approve_at = NULL
    WHERE id = p_match_id;

    -- Reject pending reports
    UPDATE public.match_reports
    SET status = 'rejected'
    WHERE match_id = p_match_id AND status = 'pending_verification';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Auto-Approve Matches Function
CREATE OR REPLACE FUNCTION public.auto_approve_matches()
RETURNS void AS $$
BEGIN
    -- Update matches where the auto_approve timer has passed
    UPDATE public.matches
    SET status = 'completed'
    WHERE status = 'reported' AND auto_approve_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable PG Cron extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-approve function to run every 15 minutes
-- NOTE: pg_cron execution context requires setting database if needed, default is postgres
SELECT cron.schedule(
    'auto_approve_matches_cron',
    '*/15 * * * *', -- Every 15 minutes
    $$ SELECT public.auto_approve_matches(); $$
);
