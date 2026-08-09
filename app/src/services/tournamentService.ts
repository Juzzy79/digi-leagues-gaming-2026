import { handleServiceError } from '../utils/errorHandler';
import { supabase } from './supabase'

export interface Tournament {
  id: string;
  circuit_id?: string | null;
  name: string;
  game: string;
  genre?: string;
  start_time?: string | null;
  end_time?: string | null;
  status: 'upcoming' | 'registration' | 'active' | 'completed';
  format: 'single_elimination' | 'double_elimination' | 'round_robin' | 'ffa_league';
  entry_type: '1v1' | 'team';
  best_of: number;
  tier: 'daily' | 'weekly' | 'monthly' | 'major';
  max_participants: number | null;
  image_url?: string | null;
  description?: string | null;
  scoring_rules?: Record<string, any>;
  has_playoffs: boolean;
  elo_multiplier: number;
  auto_start_min_players?: number | null;
  auto_schedule_next: boolean;
  created_at: string;
  winner_id?: string | null;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  score1: number;
  score2: number;
  status: 'scheduled' | 'ongoing' | 'completed';
  group_name: string | null;
  is_ffa: boolean;
  ffa_results: any | null;
  created_at: string;
  player1?: { id: string, username: string, avatar_url?: string | null };
  player2?: { id: string, username: string, avatar_url?: string | null };
}

export interface TournamentBlueprint {
  id: string;
  name: string;
  genre: string;
  game: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  max_participants: number;
  prize_pool_points: number;
  settings: Record<string, any>;
  is_active: boolean;
  last_run_at: string | null;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  player_id: string;
  team_id: string | null;
  registration_time: string;
  checked_in: boolean;
}

export async function getTournaments(statusFilter?: string[]) {
  try {
    let query = supabase.from('tournaments').select(`
      *,
      circuits(name)
    `).order('start_time', { ascending: true });
    
    if (statusFilter && statusFilter.length > 0) {
      query = query.in('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { data: [], error: err };
  }
}

export async function getTournamentsByCircuit(circuitId: string) {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('circuit_id', circuitId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { data: [], error: err };
  }
}

export async function createTournament(tournament: Partial<Tournament>) {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .insert(tournament)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { success: false, data: null, error: err };
  }
}

export async function registerForTournament(tournamentId: string, playerId: string, teamName?: string) {
  try {
    const { data, error } = await supabase
      .from('tournament_participants')
      .insert({ 
        tournament_id: tournamentId, 
        participant_id: playerId,
        team_name: teamName || null 
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { success: false, data: null, error: err };
  }
}

export async function checkRegistration(tournamentId: string, playerId: string) {
  try {
    const { data, error } = await supabase
      .from('tournament_participants')
      .select('id, status')
      .eq('tournament_id', tournamentId)
      .eq('participant_id', playerId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows
    return { isRegistered: !!data, status: data?.status || null, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { isRegistered: false, status: null, error: err };
  }
}

export async function getTournamentRegistrations(tournamentId: string) {
  try {
    const { data, error } = await supabase
      .from('tournament_participants')
      .select('id, participant_id, status, profiles!inner(username, mmr)')
      .eq('tournament_id', tournamentId);

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { data: [], error: err };
  }
}

export async function getBlueprints() {
  try {
    const { data, error } = await supabase
      .from('tournament_blueprints')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return { data: data as TournamentBlueprint[], error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { data: [], error: err };
  }
}

export async function materializeTournament(blueprint: TournamentBlueprint) {
  try {
    const now = new Date();
    let startTime = new Date();
    
    if (blueprint.frequency === 'daily') {
      startTime.setDate(now.getDate() + 1);
      startTime.setHours(18, 0, 0, 0);
    } else if (blueprint.frequency === 'weekly') {
      startTime.setDate(now.getDate() + (7 - now.getDay()));
      startTime.setHours(12, 0, 0, 0);
    }

    const newTournament = {
      name: `${blueprint.name} - ${startTime.toLocaleDateString()}`,
      game: blueprint.game,
      genre: blueprint.genre,
      start_time: startTime.toISOString(),
      max_participants: blueprint.max_participants,
      status: 'upcoming' as const,
      image_url: blueprint.settings?.image_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80'
    };

    const { data: tData, error: tError } = await supabase
      .from('tournaments')
      .insert(newTournament)
      .select()
      .single();

    if (tError) throw tError;

    await supabase
      .from('tournament_blueprints')
      .update({ last_run_at: now.toISOString() })
      .eq('id', blueprint.id);

    return { success: true, data: tData, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { success: false, data: null, error: err };
  }
}

export async function getTournamentMatches(tournamentId: string) {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        participant1:participant1_id(
          id,
          profiles(id, username, avatar_url)
        ),
        participant2:participant2_id(
          id,
          profiles(id, username, avatar_url)
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Transform data to match the expected UI structure
    const transformedData = data?.map(m => ({
      ...m,
      player1: m.participant1?.profiles,
      player2: m.participant2?.profiles,
      player1_id: m.participant1?.id, // Note: This is participant ID, not profile ID now
      player2_id: m.participant2?.id
    }));

    return { data: transformedData, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { data: [], error: err };
  }
}

export async function startTournament(tournamentId: string) {
  try {
    // 1. Fetch tournament details
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tErr) throw tErr;
    if (!tournament) throw new Error("Tournament not found");

    // 2. Fetch participants
    const { data: participants, error: pErr } = await supabase
      .from('tournament_participants')
      .select('id, participant_id, team_name')
      .eq('tournament_id', tournamentId);

    if (pErr) throw pErr;
    if (!participants || participants.length < 2) {
      throw new Error("Must have at least 2 participants to start.");
    }

    // Update status to active
    await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);

    const format = tournament.format || 'single_elimination';
    const matchesToInsert: any[] = [];

    if (format === 'single_elimination') {
      const N = participants.length;
      const R = Math.ceil(Math.log2(N)); // Number of rounds
      const K = Math.pow(2, R);          // Bracket size (power of 2)

      // Generate all matches for all rounds
      // Round 1 matches: K / 2
      // For each subsequent round r, number of matches is K / (2^r)
      // Note: bracket match IDs are tracked by the bracketMatchId field on each insert object
      
      for (let r = 1; r <= R; r++) {
        const numMatches = K / Math.pow(2, r);
        for (let m = 1; m <= numMatches; m++) {
          const bracketMatchId = `R${r}-M${m}`;
          matchesToInsert.push({
            tournament_id: tournamentId,
            round: r,
            bracket_match_id: bracketMatchId,
            participant1_id: null,
            participant2_id: null,
            status: 'scheduled'
          });
        }
      }

      // Populate Round 1 matches with participants
      // Pair 0 vs K-1, 1 vs K-2, etc.
      const round1Matches = matchesToInsert.filter(m => m.round === 1);
      for (let i = 0; i < round1Matches.length; i++) {
        const p1 = participants[i] ? participants[i].id : null;
        const p2 = participants[K - 1 - i] ? participants[K - 1 - i].id : null;
        round1Matches[i].participant1_id = p1;
        round1Matches[i].participant2_id = p2;

        // Auto-resolve if one side is a BYE
        if (p1 && !p2) {
          round1Matches[i].winner_id = p1;
          round1Matches[i].status = 'completed';
          round1Matches[i].score1 = 1;
          round1Matches[i].score2 = 0;
        } else if (!p1 && p2) {
          round1Matches[i].winner_id = p2;
          round1Matches[i].status = 'completed';
          round1Matches[i].score1 = 0;
          round1Matches[i].score2 = 1;
        }
      }

      // Insert all matches
      const { data: insertedMatches, error: insertErr } = await supabase
        .from('matches')
        .insert(matchesToInsert)
        .select();

      if (insertErr) throw insertErr;

      // Handle advancement for completed BYE matches
      const completedByes = insertedMatches.filter(m => m.status === 'completed');
      for (const match of completedByes) {
        await advanceBracket(match, insertedMatches);
      }

    } else if (format === 'double_elimination') {
      // Streamlined Double Elimination for 4 players
      const N = participants.length;
      if (N !== 4) {
        // Simple fallback to Single Elimination if not exactly 4 players
        throw new Error("Double Knockout currently optimized for exactly 4 players.");
      }

      // Winner Bracket Round 1
      matchesToInsert.push({ tournament_id: tournamentId, round: 1, bracket_match_id: 'WB-R1-M1', participant1_id: participants[0].id, participant2_id: participants[3].id, status: 'scheduled' });
      matchesToInsert.push({ tournament_id: tournamentId, round: 1, bracket_match_id: 'WB-R1-M2', participant1_id: participants[1].id, participant2_id: participants[2].id, status: 'scheduled' });
      
      // Winner Bracket Winners Final
      matchesToInsert.push({ tournament_id: tournamentId, round: 2, bracket_match_id: 'WB-R2-M1', participant1_id: null, participant2_id: null, status: 'scheduled' });
      
      // Loser Bracket Losers Semifinal
      matchesToInsert.push({ tournament_id: tournamentId, round: 1, bracket_match_id: 'LB-R1-M1', participant1_id: null, participant2_id: null, status: 'scheduled' });
      
      // Loser Bracket Losers Final
      matchesToInsert.push({ tournament_id: tournamentId, round: 2, bracket_match_id: 'LB-R2-M1', participant1_id: null, participant2_id: null, status: 'scheduled' });
      
      // Grand Final
      matchesToInsert.push({ tournament_id: tournamentId, round: 3, bracket_match_id: 'GF-M1', participant1_id: null, participant2_id: null, status: 'scheduled' });
      matchesToInsert.push({ tournament_id: tournamentId, round: 4, bracket_match_id: 'GF-M2', participant1_id: null, participant2_id: null, status: 'scheduled' });

      const { error: insertErr } = await supabase.from('matches').insert(matchesToInsert);
      if (insertErr) throw insertErr;

    } else if (format === 'round_robin') {
      // Round Robin Matchups: Every player plays everyone
      const N = participants.length;
      const rounds = N % 2 === 0 ? N - 1 : N;
      const matchesList: any[] = [];
      
      // Circle method scheduling
      const players = [...participants];
      if (N % 2 !== 0) {
        players.push({ id: null as any, participant_id: null as any }); // Dummy player for bye
      }
      
      const numPlayers = players.length;
      for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < numPlayers / 2; i++) {
          const p1 = players[i];
          const p2 = players[numPlayers - 1 - i];
          
          if (p1.id && p2.id) {
            matchesList.push({
              tournament_id: tournamentId,
              round: r + 1,
              bracket_match_id: `RR-R${r+1}-M${i+1}`,
              participant1_id: p1.id,
              participant2_id: p2.id,
              status: 'scheduled'
            });
          }
        }
        // Rotate players array (keep first element fixed)
        players.splice(1, 0, players.pop()!);
      }

      const { error: insertErr } = await supabase.from('matches').insert(matchesList);
      if (insertErr) throw insertErr;

    } else if (format === 'ffa_league') {
      // FFA League: A single multiplayer round
      const { error: insertErr } = await supabase.from('matches').insert({
        tournament_id: tournamentId,
        round: 1,
        bracket_match_id: 'FFA-M1',
        is_ffa: true,
        status: 'scheduled'
      });
      if (insertErr) throw insertErr;
    } else if (format === 'standalone_series') {
      const teamsMap: Record<string, any[]> = {};
      participants.forEach(p => {
        const tName = p.team_name || 'Individual';
        if (!teamsMap[tName]) teamsMap[tName] = [];
        teamsMap[tName].push(p);
      });

      const teamNames = Object.keys(teamsMap);
      if (teamNames.length !== 2) {
        throw new Error("Standalone Series format requires exactly 2 teams to start.");
      }

      const p1 = teamsMap[teamNames[0]][0].id;
      const p2 = teamsMap[teamNames[1]][0].id;

      const { error: insertErr } = await supabase.from('matches').insert({
        tournament_id: tournamentId,
        round: 1,
        bracket_match_id: 'SERIES-M1',
        participant1_id: p1,
        participant2_id: p2,
        status: 'scheduled',
        genre_stats: {
          team1_name: teamNames[0],
          team2_name: teamNames[1],
          games: []
        }
      });
      if (insertErr) throw insertErr;
    }

    return { success: true };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    
    return { success: false, error: err };
  }
}

async function advanceBracket(completedMatch: any, allTournamentMatches: any[]) {
  const { tournament_id, bracket_match_id, winner_id } = completedMatch;
  if (!bracket_match_id || !winner_id) return;

  // Single Elimination Progression
  if (bracket_match_id.startsWith('R')) {
    const parts = bracket_match_id.split('-');
    const round = parseInt(parts[0].replace('R', ''));
    const matchNum = parseInt(parts[1].replace('M', ''));
    
    const nextRound = round + 1;
    const nextMatchNum = Math.ceil(matchNum / 2);
    const nextBracketMatchId = `R${nextRound}-M${nextMatchNum}`;

    // Find the next match
    let nextMatch = allTournamentMatches.find(m => m.bracket_match_id === nextBracketMatchId);
    if (!nextMatch) {
      // Try to fetch from DB if not in current array
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournament_id)
        .eq('bracket_match_id', nextBracketMatchId)
        .single();
      nextMatch = data;
    }

    if (nextMatch) {
      const isPlayer1Slot = matchNum % 2 !== 0;
      const updateData: any = {};
      if (isPlayer1Slot) {
        updateData.participant1_id = winner_id;
      } else {
        updateData.participant2_id = winner_id;
      }
      await supabase.from('matches').update(updateData).eq('id', nextMatch.id);
    } else {
      // No next match found: This was the finals!
      await completeTournament(tournament_id, winner_id);
    }
  }

  // Double Elimination Progression (4 players only)
  if (bracket_match_id.startsWith('WB') || bracket_match_id.startsWith('LB') || bracket_match_id.startsWith('GF')) {
    // Loser identification
    const loser_id = completedMatch.winner_id === completedMatch.participant1_id 
      ? completedMatch.participant2_id 
      : completedMatch.participant1_id;

    // Fetch all matches for the tournament to inspect bracket state
    const { data: matches } = await supabase.from('matches').select('*').eq('tournament_id', tournament_id);
    if (!matches) return;

    if (bracket_match_id === 'WB-R1-M1' || bracket_match_id === 'WB-R1-M2') {
      // Winner final: WB-R2-M1
      const wFinal = matches.find(m => m.bracket_match_id === 'WB-R2-M1');
      if (wFinal) {
        const slot = bracket_match_id === 'WB-R1-M1' ? 'participant1_id' : 'participant2_id';
        await supabase.from('matches').update({ [slot]: winner_id }).eq('id', wFinal.id);
      }

      // Loser semifinal: LB-R1-M1
      const lSemi = matches.find(m => m.bracket_match_id === 'LB-R1-M1');
      if (lSemi) {
        const slot = bracket_match_id === 'WB-R1-M1' ? 'participant1_id' : 'participant2_id';
        await supabase.from('matches').update({ [slot]: loser_id }).eq('id', lSemi.id);
      }
    }

    if (bracket_match_id === 'WB-R2-M1') {
      // Winners final winner goes to Grand Final: GF-M1 (player 1 slot)
      const gf1 = matches.find(m => m.bracket_match_id === 'GF-M1');
      if (gf1) {
        await supabase.from('matches').update({ participant1_id: winner_id }).eq('id', gf1.id);
      }
      // Loser drops to Losers Final: LB-R2-M1 (player 2 slot)
      const lFinal = matches.find(m => m.bracket_match_id === 'LB-R2-M1');
      if (lFinal) {
        await supabase.from('matches').update({ participant2_id: loser_id }).eq('id', lFinal.id);
      }
    }

    if (bracket_match_id === 'LB-R1-M1') {
      // Winner goes to Losers Final: LB-R2-M1 (player 1 slot)
      const lFinal = matches.find(m => m.bracket_match_id === 'LB-R2-M1');
      if (lFinal) {
        await supabase.from('matches').update({ participant1_id: winner_id }).eq('id', lFinal.id);
      }
    }

    if (bracket_match_id === 'LB-R2-M1') {
      // Winner goes to Grand Final: GF-M1 (player 2 slot)
      const gf1 = matches.find(m => m.bracket_match_id === 'GF-M1');
      if (gf1) {
        await supabase.from('matches').update({ participant2_id: winner_id }).eq('id', gf1.id);
      }
    }

    if (bracket_match_id === 'GF-M1') {
      // If winner is the WB player (player 1), they win the tournament!
      if (winner_id === completedMatch.participant1_id) {
        await completeTournament(tournament_id, winner_id);
      } else {
        // Bracket reset: Loser bracket player won, so they play GF-M2
        const gf2 = matches.find(m => m.bracket_match_id === 'GF-M2');
        if (gf2) {
          await supabase.from('matches').update({
            participant1_id: completedMatch.participant1_id,
            participant2_id: completedMatch.participant2_id,
            status: 'scheduled'
          }).eq('id', gf2.id);
        }
      }
    }

    if (bracket_match_id === 'GF-M2') {
      // The winner of GF-M2 wins the tournament!
      await completeTournament(tournament_id, winner_id);
    }
  }
}

export async function updateMatchScore(matchId: string, score1: number, score2: number, winnerId: string, genreStats?: any) {
  try {
    const updateData: any = {
      score1,
      score2,
      winner_id: winnerId,
      status: 'completed'
    };
    if (genreStats) {
      updateData.genre_stats = genreStats;
    }

    // Update match score in matches table
    const { data: updatedMatch, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId)
      .select()
      .single();

    if (error) throw error;

    // Fetch tournament format
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('format')
      .eq('id', updatedMatch.tournament_id)
      .single();

    if (tournament && tournament.format === 'standalone_series') {
      if (winnerId && updatedMatch.tournament_id) {
        await completeTournament(updatedMatch.tournament_id, winnerId);
      }
      return { success: true, error: null };
    }

    // Advance bracket / league progression
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', updatedMatch.tournament_id);

    if (allMatches) {
      await advanceBracket(updatedMatch, allMatches);
      
      // Check if all matches are completed for round robin
      const unfinished = allMatches.filter(m => m.status !== 'completed' && m.id !== matchId);
      if (unfinished.length === 0 && updatedMatch.tournament_id) {
        // Determine winner
        const { data: regs } = await supabase.from('tournament_participants').select('player_id, profiles(username)').eq('tournament_id', updatedMatch.tournament_id);
        const standings = calculateStandings(regs || [], allMatches);
        const topWinner = standings[0]?.id;
        if (topWinner) {
          await completeTournament(updatedMatch.tournament_id, topWinner);
        } else {
          await supabase.from('tournaments').update({ status: 'completed' }).eq('id', updatedMatch.tournament_id);
        }
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { success: false, error: err };
  }
}

export function calculateStandings(registrations: any[], matches: any[]) {
  // If no registrations provided, we can try to derive players from matches
  let players = [...registrations];
  
  if (players.length === 0 && matches.length > 0) {
    const playerMap = new Map();
    matches.forEach(m => {
      if (m.player1_id) playerMap.set(m.player1_id, m.player1?.username || 'Unknown');
      if (m.player2_id) playerMap.set(m.player2_id, m.player2?.username || 'Unknown');
    });
    players = Array.from(playerMap.entries()).map(([id, username]) => ({
      player_id: id,
      profiles: { username }
    }));
  }

  const standings = players.map(reg => ({
    id: reg.player_id,
    name: reg.profiles?.username || 'Unknown Operator',
    played: 0,
    wins: 0,
    losses: 0,
    scoreDiff: 0,
    points: 0,
    groupName: reg.group_name || 'General'
  }));

  matches.forEach(match => {
    if (match.status !== 'completed') return;

    const p1 = standings.find(s => s.id === match.player1_id);
    const p2 = standings.find(s => s.id === match.player2_id);

    if (p1 && p2) {
      p1.played++;
      p2.played++;
      const s1 = match.score1 || 0;
      const s2 = match.score2 || 0;
      p1.scoreDiff += (s1 - s2);
      p2.scoreDiff += (s2 - s1);

      if (s1 > s2) {
        p1.wins++;
        p1.points += 3;
        p2.losses++;
      } else if (s2 > s1) {
        p2.wins++;
        p2.points += 3;
        p1.losses++;
      } else {
        p1.points += 1;
        p2.points += 1;
      }
    }
  });

  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.scoreDiff - a.scoreDiff;
  });
}

// ==========================================
// PHASE 4: TOURNAMENT AS APPOINTMENT VIEWING
// ==========================================

export async function completeTournament(tournamentId: string, winnerId: string) {
  try {
    // 1. Update Tournament
    await supabase.from('tournaments').update({ 
      status: 'completed',
      winner_id: winnerId 
    }).eq('id', tournamentId);

    const { data: tourData } = await supabase.from('tournaments').select('name').eq('id', tournamentId).single();
    const tourName = tourData?.name || 'A Tournament';

    // 2. Fetch winner profile to post spotlight
    const { data: winnerProf } = await supabase.from('profiles').select('username, avatar_url').eq('id', winnerId).single();
    
    if (winnerProf) {
      await supabase.from('activity_feed').insert({
        user_id: winnerId,
        username: winnerProf.username,
        user_avatar: winnerProf.avatar_url,
        event_type: 'tournament_win',
        description: `has been crowned Champion of ${tourName}! 🏆`
      });
    }

    // 3. Process Pick'em predictions
    // Award XP to those who guessed correctly
    const { data: predictions } = await supabase.from('tournament_predictions')
      .select('user_id, predicted_winner_id, reward_xp')
      .eq('tournament_id', tournamentId)
      .eq('status', 'pending');

    if (predictions && predictions.length > 0) {
      for (const pred of predictions) {
        if (pred.predicted_winner_id === winnerId) {
          await supabase.from('tournament_predictions').update({ status: 'correct' }).eq('tournament_id', tournamentId).eq('user_id', pred.user_id);
          await supabase.rpc('award_career_xp', { p_user_id: pred.user_id, p_amount: pred.reward_xp });
        } else {
          await supabase.from('tournament_predictions').update({ status: 'incorrect' }).eq('tournament_id', tournamentId).eq('user_id', pred.user_id);
        }
      }
    }

    // 4. Trigger auto_schedule_next
    await supabase.rpc('auto_schedule_next_tournament', { p_tournament_id: tournamentId });
    
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    
  }
}

export async function submitPrediction(tournamentId: string, userId: string, predictedWinnerId: string) {
  const { error } = await supabase.from('tournament_predictions').insert({
    tournament_id: tournamentId,
    user_id: userId,
    predicted_winner_id: predictedWinnerId,
    status: 'pending',
    reward_xp: 150
  });
  return { success: !error, error };
}

export async function getPredictions(tournamentId: string) {
  const { data, error } = await supabase.from('tournament_predictions').select('*').eq('tournament_id', tournamentId);
  return { data, error };
}

export async function removeParticipant(tournamentId: string, participantId: string) {
  try {
    const { error } = await supabase
      .from('tournament_participants')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('participant_id', participantId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { success: false, error: err };
  }
}

export async function deleteTournament(id: string) {
  try {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    handleServiceError(err, 'tournamentService');
    return { success: false, error: err };
  }
}


