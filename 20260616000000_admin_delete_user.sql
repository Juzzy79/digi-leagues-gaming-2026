-- ============================================================================
-- SQL MIGRATION: ADMIN DELETE USER RPC
-- ============================================================================
-- The frontend attempts to call 'delete_user_by_admin' when you delete someone
-- from the Active Personnel screen. If this function is missing, it falls back
-- to just deleting the public profile, which means their underlying Auth account
-- remains active, and their profile gets automatically regenerated.
--
-- This function deletes the user entirely from the core auth system, permanently
-- wiping their account and all cascading data.

CREATE OR REPLACE FUNCTION delete_user_by_admin(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function creator (admin)
AS $$
BEGIN
  -- 1. Ensure the person invoking this is an Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can terminate personnel records.';
  END IF;

  -- 2. Delete the user from the core authentication table.
  -- Since public.profiles has an ON DELETE CASCADE relationship with auth.users,
  -- this will also completely wipe their public profile, match history, and everything else.
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
