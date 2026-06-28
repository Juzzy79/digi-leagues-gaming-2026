-- 20260404000000_grand_prix_sessions.sql
-- High-Speed Session-Based Tournament System

-- 1. Sessions Table (The "Series" Container)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuit_id UUID REFERENCES public.circuits(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    game TEXT NOT NULL,
    point_scale JSONB NOT NULL DEFAULT '{"1": 10, "2": 5, "3": 2}',
    max_games INTEGER NOT NULL DEFAULT 7,
    current_game INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'active', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Session Participants (The "Check-in" Table)
CREATE TABLE IF NOT EXISTS public.session_participants (
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    rank_in_session INTEGER,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (session_id, player_id)
);

-- 3. Session Games (Individual Matches within the Series)
CREATE TABLE IF NOT EXISTS public.session_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    game_number INTEGER NOT NULL,
    placements JSONB NOT NULL, -- Format: {"player_uuid": 1, "other_uuid": 2}
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_games ENABLE ROW LEVEL SECURITY;

-- Sessions: Anyone can view, only Admin/Creator can write
CREATE POLICY "Public read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Admin create sessions" ON sessions FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin update sessions" ON sessions FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR id = creator_id)));

-- Participants: Anyone can view, players can insert (check-in), Admin can update
CREATE POLICY "Public read participants" ON session_participants FOR SELECT USING (true);
CREATE POLICY "Players check-in" ON session_participants FOR INSERT 
    WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Admin manage participants" ON session_participants FOR ALL 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Games: Anyone can view, Admin can report
CREATE POLICY "Public read games" ON session_games FOR SELECT USING (true);
CREATE POLICY "Admin report games" ON session_games FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))));

-- TRIGGERS
-- (Optional) We can add a function to update total_points on game insert, 
-- but we'll handle this in the service layer for transparency for now.
