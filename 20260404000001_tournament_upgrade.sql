-- 20260404000001_tournament_upgrade.sql
-- Upgrading tournaments to support formats, tiers, and advanced tracking.

-- 1. Extend Tournaments Table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'ffa_league' CHECK (format IN ('single_elimination', 'round_robin', 'ffa_league')),
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'daily' CHECK (tier IN ('daily', 'weekly', 'monthly', 'major')),
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Create Tournament Matches (For Brackets/Leagues)
CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 1,
    player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    score1 INTEGER DEFAULT 0,
    score2 INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed')),
    group_name TEXT, -- For Round Robin groups
    is_ffa BOOLEAN DEFAULT false,
    ffa_results JSONB, -- For FFA placements
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Matches
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read matches" ON tournament_matches FOR SELECT USING (true);
CREATE POLICY "Admin manage matches" ON tournament_matches FOR ALL 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. Update Tournament Blueprint to include format
ALTER TABLE public.tournament_blueprints 
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'ffa_league';
