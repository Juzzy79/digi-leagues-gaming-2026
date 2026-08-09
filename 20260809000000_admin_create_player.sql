-- ============================================================================
-- SQL MIGRATION: ADMIN CREATE MANUAL PLAYER RPC
-- ============================================================================
-- Run this in your Supabase SQL Editor to allow administrators to manually 
-- create player accounts and profiles directly from the admin interface.

CREATE OR REPLACE FUNCTION public.create_manual_player(
  p_username TEXT,
  p_mmr INTEGER DEFAULT 1000,
  p_usr INTEGER DEFAULT 1000
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function creator (database owner)
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- 1. Ensure the person invoking this is an Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can create manual player records.';
  END IF;

  -- 2. Generate a unique UUID for the new manual player
  v_user_id := gen_random_uuid();
  
  -- 3. Construct a local mock email address
  v_email := 'manual_' || lower(replace(p_username, ' ', '_')) || '_' || substring(v_user_id::text from 1 for 8) || '@digileagues.local';

  -- 4. Insert the mock user into auth.users (enables authentication if needed, but primarily resolves foreign keys)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    aud,
    role,
    instance_id
  )
  VALUES (
    v_user_id,
    v_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    jsonb_build_object('username', p_username),
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000'
  );

  -- 5. The trigger handle_new_user() will automatically insert a public.profiles record.
  -- Update the newly created profile with the custom starting stats (MMR and USR).
  UPDATE public.profiles
  SET 
    mmr = p_mmr,
    usr = p_usr
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;
