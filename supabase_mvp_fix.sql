-- ==========================================
-- SUPABASE MVP FIX SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. FIX MISSING COLUMN
ALTER TABLE IF EXISTS public.tournaments 
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

-- 2. CREATE AUTH TRIGGER (AUTO-PROFILE CREATION)
-- This ensures every new signup gets a public profile record automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, mmr, usr, wins, losses, win_rate, current_streak)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    1000, -- Default Starting MMR
    1000, -- Default Starting USR
    0, 0, 0, 0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ENSURE PERMISSIONS (RLS)
-- Allow users to update their own profiles (needed for setup)
CREATE POLICY IF NOT EXISTS "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Allow anyone to read profiles (needed for leaderboards/matches)
CREATE POLICY IF NOT EXISTS "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- 4. FIX ACTIVITY FEED PERMISSIONS
-- Ensure users can see the feed
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read activity_feed" ON public.activity_feed FOR SELECT USING (true);
