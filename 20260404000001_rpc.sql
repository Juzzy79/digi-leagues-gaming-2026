-- Function to increment session points atomically
CREATE OR REPLACE FUNCTION public.increment_session_points(s_id UUID, p_id UUID, pts INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.session_participants
    SET total_points = total_points + pts
    WHERE session_id = s_id AND player_id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
