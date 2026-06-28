-- ============================================================================
-- SQL MIGRATION: ADMIN ULTIMATE POWERS
-- ============================================================================
-- This script grants administrators the ability to perform highly restricted
-- actions that are normally blocked by Row Level Security (RLS).

-- 1. TEAM / CREW MANAGEMENT
-- Allow admins to disband (delete) any crew.
CREATE POLICY "Admin delete crews"
  ON public.crews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 2. MATCH HISTORY MODIFICATION
-- Allow admins to delete invalid or fraudulent match submissions.
CREATE POLICY "Admin delete match history"
  ON public.match_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 3. PROFILE MANAGEMENT (PROMOTIONS / STAT CORRECTIONS)
-- Allow admins to update other users' profiles (e.g. set is_admin = true, or fix USR).
CREATE POLICY "Admin update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- (Optional but recommended) Allow admins to update crews (e.g. change an inappropriate name)
CREATE POLICY "Admin update crews"
  ON public.crews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
