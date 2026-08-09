-- ============================================================================
-- SQL MIGRATION: SUPPORT STANDALONE SERIES TOURNAMENT FORMAT
-- ============================================================================
-- Run this in your Supabase SQL Editor to allow the 'standalone_series' format 
-- in the tournaments table check constraint.

ALTER TABLE public.tournaments 
DROP CONSTRAINT IF EXISTS tournaments_format_check;

ALTER TABLE public.tournaments 
ADD CONSTRAINT tournaments_format_check 
CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'ffa_league', 'standalone_series'));
