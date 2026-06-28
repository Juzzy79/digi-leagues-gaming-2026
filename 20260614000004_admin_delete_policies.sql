-- 20260614000004_admin_delete_policies.sql
-- Fixes an issue where Admin deletions fail silently due to missing Row Level Security (RLS) delete policies.

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuits ENABLE ROW LEVEL SECURITY;

-- 1. Sessions Delete Policy
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.sessions;
CREATE POLICY "Admins can delete sessions" 
ON public.sessions FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 2. Tournaments Delete Policy
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;
CREATE POLICY "Admins can delete tournaments" 
ON public.tournaments FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. Circuits Delete Policy
DROP POLICY IF EXISTS "Admins can delete circuits" ON public.circuits;
CREATE POLICY "Admins can delete circuits" 
ON public.circuits FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
