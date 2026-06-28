import { handleServiceError } from '../utils/errorHandler';
import { supabase } from './supabase'

export async function updateRivalry(winnerId: string, loserId: string) {
  try {
    // Update Winner's perspective (winner is player_id)
    await processRivalryUpdate(winnerId, loserId, true);
    // Update Loser's perspective (loser is player_id)
    await processRivalryUpdate(loserId, winnerId, false);
    
    return { success: true, error: null };
  } catch (err: any) {
    handleServiceError(err, 'rivalryService');
    
    return { success: false, error: err };
  }
}

async function processRivalryUpdate(playerId: string, rivalId: string, didPlayerWin: boolean) {
  // Fetch existing rivalry row
  const { data: existing } = await supabase
    .from('rivalries')
    .select('*')
    .eq('player_id', playerId)
    .eq('rival_id', rivalId)
    .single();

  if (existing) {
    let newPlayerWins = existing.player_wins + (didPlayerWin ? 1 : 0);
    let newRivalWins = existing.rival_wins + (didPlayerWin ? 0 : 1);
    let newNetScore = newPlayerWins - newRivalWins;
    let newIsNemesis = existing.is_nemesis;
    let newDogTagClaimed = existing.dog_tag_claimed;

    // Nemesis logic
    if (newNetScore >= 3) {
      newIsNemesis = true;
      newDogTagClaimed = true; // Claim their dog tag!
    } else if (newNetScore <= 0) {
      // Redemption: if net score drops to 0 or below, nemesis status is broken
      newIsNemesis = false;
    }

    await supabase
      .from('rivalries')
      .update({
        player_wins: newPlayerWins,
        rival_wins: newRivalWins,
        net_score: newNetScore,
        is_nemesis: newIsNemesis,
        dog_tag_claimed: newDogTagClaimed,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

  } else {
    // Create new rivalry row
    let newPlayerWins = didPlayerWin ? 1 : 0;
    let newRivalWins = didPlayerWin ? 0 : 1;
    let newNetScore = newPlayerWins - newRivalWins;
    
    await supabase
      .from('rivalries')
      .insert({
        player_id: playerId,
        rival_id: rivalId,
        player_wins: newPlayerWins,
        rival_wins: newRivalWins,
        net_score: newNetScore,
        is_nemesis: false,
        dog_tag_claimed: false
      });
  }
}

export async function getNemeses(userId: string) {
  try {
    const { data, error } = await supabase
      .from('rivalries')
      .select('rival_id, net_score, is_nemesis')
      .eq('player_id', userId)
      .eq('is_nemesis', true);
      
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'rivalryService');
    return { data: [], error: err };
  }
}

export async function getClaimedDogTags(userId: string) {
  try {
    const { data: rivalries, error } = await supabase
      .from('rivalries')
      .select('rival_id, net_score')
      .eq('player_id', userId)
      .eq('dog_tag_claimed', true);

    if (error) throw error;
    if (!rivalries || rivalries.length === 0) return { data: [], error: null };

    const rivalIds = rivalries.map(r => r.rival_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', rivalIds);

    const merged = rivalries.map(r => {
      const p = profiles?.find(p => p.id === r.rival_id);
      return {
        victimName: p?.username || 'Unknown',
        netScore: r.net_score
      };
    });

    return { data: merged, error: null };
  } catch (err: any) {
    handleServiceError(err, 'rivalryService');
    return { data: [], error: err };
  }
}

export async function getHeadToHeadStats(userId: string, opponentId: string) {
  try {
    // 1. Fetch Rivalry Summary
    const { data: rivalry } = await supabase
      .from('rivalries')
      .select('*')
      .eq('player_id', userId)
      .eq('rival_id', opponentId)
      .single();

    // 2. Fetch Recent Challenges
    const { data: challenges } = await supabase
      .from('challenges')
      .select('*')
      .eq('status', 'resolved')
      .or(`and(challenger_id.eq.${userId},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${userId})`)
      .order('created_at', { ascending: false });

    // Calculate Genre Breakdown
    const genreBreakdown: Record<string, { wins: number, losses: number }> = {};
    const recentMeetings = (challenges || []).slice(0, 5).map(c => ({
      id: c.id,
      game: c.game,
      date: c.created_at,
      didWin: c.winner_id === userId
    }));

    (challenges || []).forEach(c => {
      // We don't have genre stored directly on challenges right now, we can map common games or just use game name
      // For simplicity, we just use game as genre/bucket
      const bucket = c.game;
      if (!genreBreakdown[bucket]) {
        genreBreakdown[bucket] = { wins: 0, losses: 0 };
      }
      if (c.winner_id === userId) {
        genreBreakdown[bucket].wins++;
      } else {
        genreBreakdown[bucket].losses++;
      }
    });

    return { 
      data: {
        rivalry: rivalry || { player_wins: 0, rival_wins: 0, net_score: 0, is_nemesis: false, dog_tag_claimed: false },
        recentMeetings,
        genreBreakdown
      }, 
      error: null 
    };
  } catch (err: any) {
    handleServiceError(err, 'rivalryService');
    return { data: null, error: err };
  }
}

export async function findDynamicRivals(userId: string) {
  try {
    // Fetch user's current USR
    const { data: profile } = await supabase
      .from('profiles')
      .select('usr')
      .eq('id', userId)
      .single();

    if (!profile) return { data: [], error: null };

    // Find players within +/- 75 USR
    const minUsr = (profile.usr || 1000) - 75;
    const maxUsr = (profile.usr || 1000) + 75;

    const { data: similarPlayers, error } = await supabase
      .from('profiles')
      .select('id, username, usr, avatar_url')
      .neq('id', userId)
      .gte('usr', minUsr)
      .lte('usr', maxUsr)
      .limit(5);

    if (error) throw error;
    return { data: similarPlayers, error: null };
  } catch (err: any) {
    handleServiceError(err, 'rivalryService');
    return { data: [], error: err };
  }
}

