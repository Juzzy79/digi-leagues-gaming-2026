import { handleServiceError } from '../utils/errorHandler';
import { supabase } from './supabase'
import { notifyChallengeReceived } from './notificationService'

export interface Challenge {
  id: string;
  challenger_id: string;
  challenger_name: string;
  opponent_id: string;
  opponent_name: string;
  game: string;
  rules: string | null;
  duration_hours: number;
  end_time: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'resolved';
  winner_id: string | null;
  created_at: string;
}

export async function createChallenge(data: Partial<Challenge>) {
  try {
    // Check limit: max 3 challenges per 24h between these two
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recent, error: countErr } = await supabase
      .from('challenges')
      .select('id')
      .eq('challenger_id', data.challenger_id)
      .eq('opponent_id', data.opponent_id)
      .gte('created_at', twentyFourHoursAgo);

    if (countErr) throw countErr;
    
    if (recent && recent.length >= 3) {
      throw new Error("Maximum of 3 challenges per 24 hours against this operator.");
    }

    const { data: result, error } = await supabase
      .from('challenges')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    
    // Also notify activity feed
    await supabase.from('activity_feed').insert({
      user_id: data.challenger_id,
      username: data.challenger_name,
      event_type: 'challenge_issued',
      description: `Issued a combat challenge to ${data.opponent_name} in ${data.game}`
    });

    // Fire notification to opponent (non-blocking)
    if (data.opponent_id && data.challenger_name && data.game) {
      notifyChallengeReceived(data.opponent_id, data.challenger_name, data.game).catch(() => {})
    }

    return { success: true, data: result, error: null };
  } catch (err: any) {
    handleServiceError(err, 'challengeService');
    return { success: false, data: null, error: err };
  }
}

export async function getPendingChallenges(userId: string) {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('opponent_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'challengeService');
    return { data: [], error: err };
  }
}

export async function getAcceptedChallenges(userId: string) {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('status', 'accepted')
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`);

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'challengeService');
    return { data: [], error: err };
  }
}

export async function updateChallengeStatus(challengeId: string, status: 'accepted' | 'declined' | 'resolved', winnerId?: string) {
  try {
    const updates: any = { status };
    if (winnerId) updates.winner_id = winnerId;
    
    const { error } = await supabase
      .from('challenges')
      .update(updates)
      .eq('id', challengeId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    handleServiceError(err, 'challengeService');
    return { success: false, error: err };
  }
}

