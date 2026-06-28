-- ============================================================
-- PHASE 3 SCHEMA MIGRATION: CREWS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tag TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read crews"
  ON public.crews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create crews"
  ON public.crews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


CREATE TABLE IF NOT EXISTS public.crew_members (
  crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read crew members"
  ON public.crew_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join crews"
  ON public.crew_members FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IN (SELECT owner_id FROM public.crews WHERE id = crew_id));

CREATE POLICY "Members can leave crews"
  ON public.crew_members FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT owner_id FROM public.crews WHERE id = crew_id));


-- Ensure crew chat channel is queryable
-- The messages table already has a 'channel' text column. 
-- We will use 'crew_{crew_id}' as the channel name.
