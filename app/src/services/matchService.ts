import { handleServiceError } from '../utils/errorHandler';
import { supabase } from './supabase'
import { calculateMMRChange, calculateUSR, normalizePerformance, GENRES, getTier } from './rankingService'
import { updateRivalry } from './rivalryService'
import { updateChallengeStatus } from './challengeService'
import { updatePlayStreak } from './streakService'
import { notifyRankOvertaken } from './notificationService'
import { evaluatePostMatchAchievements } from './achievementService'

export interface MatchResult {
  game: string
  genre: string
  result: 'Win' | 'Loss' | 'Solo'
  score?: number
  stats: Record<string, any> // e.g., { kills: 20, deaths: 5 }
  challengeId?: string
  isPractice?: boolean
  isAi?: boolean
}

export async function submitMatch(userId: string, data: MatchResult) {
  try {
    // 1. Fetch current profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('mmr, wins, losses, current_streak, username, avatar_url, genre_ratings, usr')
      .eq('id', userId)
      .single()

    if (profileErr) throw profileErr

    const isWin = data.result === 'Win'
    const genreRatings = profile.genre_ratings || {}
    const currentGenreData = genreRatings[data.genre] || { rating: 1200, baseline: null }
    const currentMmr = currentGenreData.rating
    const currentStreak = profile.current_streak || 0
    const currentTier = getTier(profile.usr || 1000)

    // 2. Normalization & Rating logic
    let communityBaseline: number | undefined = undefined;
    let personalBaseline: number | undefined = undefined;

    if (GENRES[data.genre]?.isHighScore && data.stats?.score !== undefined) {
      const currentScore = data.stats.score;
      const currentOom = Math.log10(Math.max(1, currentScore));
      
      // Fetch Community Average
      const { data: communityHistory } = await supabase
        .from('match_history')
        .select('stats')
        .eq('game', data.game)
        .eq('is_practice', false)
        .limit(200);

      const commScores = communityHistory
        ?.map(h => h.stats?.score)
        .filter(s => typeof s === 'number')
        .filter(s => Math.abs(Math.log10(Math.max(1, s)) - currentOom) <= 1.5) || [];
        
      if (commScores.length > 0) {
        communityBaseline = commScores.reduce((a, b) => a + b, 0) / commScores.length;
      }

      // Fetch Personal Best
      const { data: personalHistory } = await supabase
        .from('match_history')
        .select('stats')
        .eq('game', data.game)
        .eq('user_id', userId)
        .eq('is_practice', false);

      const persScores = personalHistory
        ?.map(h => h.stats?.score)
        .filter(s => typeof s === 'number')
        .filter(s => Math.abs(Math.log10(Math.max(1, s)) - currentOom) <= 1.5) || [];
        
      if (persScores.length > 0) {
        personalBaseline = Math.max(...persScores);
      }
    } else if (data.genre === 'Racing' && data.stats?.track_name) {
      const metric = data.stats.best_lap ? 'best_lap' : 'total_time';
      const currentVal = data.stats[metric];
      
      if (currentVal) {
        const currentOom = Math.log10(Math.max(1, currentVal));
        
        const { data: communityHistory } = await supabase
          .from('match_history')
          .select('stats')
          .eq('game', data.game)
          .eq('is_practice', false)
          .limit(200);

        const commScores = communityHistory
          ?.filter(h => h.stats?.track_name === data.stats.track_name)
          .map(h => h.stats?.[metric])
          .filter(s => typeof s === 'number')
          .filter(s => Math.abs(Math.log10(Math.max(1, s)) - currentOom) <= 1.5) || [];
          
        if (commScores.length > 0) {
          communityBaseline = commScores.reduce((a, b) => a + b, 0) / commScores.length;
        }

        const { data: personalHistory } = await supabase
          .from('match_history')
          .select('stats')
          .eq('game', data.game)
          .eq('user_id', userId)
          .eq('is_practice', false);

        const persScores = personalHistory
          ?.filter(h => h.stats?.track_name === data.stats.track_name)
          .map(h => h.stats?.[metric])
          .filter(s => typeof s === 'number') || [];
          
        if (persScores.length > 0) {
          personalBaseline = Math.min(...persScores);
        }
      }
    } // Pass the hybrid baselines object instead of the old genre baseline
    const performanceIndex = normalizePerformance(data.genre, data.stats, { 
      community: communityBaseline, 
      personal: personalBaseline 
    })
    const mmrChange = calculateMMRChange(currentMmr, performanceIndex, data.result, currentStreak, data.stats?.teammates, data.isAi)
    const newGenreRating = currentMmr + mmrChange

    // Update genre ratings JSONB
    const newGenreRatings = {
      ...genreRatings,
      [data.genre]: {
        rating: newGenreRating,
        baseline: (GENRES[data.genre]?.isHighScore && !currentGenreData.baseline) 
          ? data.stats.score 
          : currentGenreData.baseline
      }
    }

    // Recalculate Universal Skill Rating (USR)
    const rawRatings: Record<string, number> = {}
    Object.keys(newGenreRatings).forEach(k => rawRatings[k] = newGenreRatings[k].rating)
    const newUsr = calculateUSR(rawRatings)

    // 3. ATOMIC LOGGING via Supabase RPC
    // This ensures match_history and profiles are updated together (airtight)
    const { error: rpcErr } = await supabase.rpc('log_match_transaction', {
      p_user_id: userId,
      p_match_data: data,
      p_mmr_change: data.isPractice ? 0 : mmrChange,
      p_new_mmr: data.isPractice ? currentMmr : newGenreRating,
      p_genre_ratings: data.isPractice ? genreRatings : newGenreRatings,
      p_new_usr: data.isPractice ? (profile.usr || 1000) : newUsr,
      p_is_practice: !!data.isPractice
    })

    if (rpcErr) throw rpcErr

    // Handle Challenges & Rivalries
    let opponentId: string | undefined = undefined;

    if (data.challengeId) {
      const { data: challenge } = await supabase.from('challenges').select('*').eq('id', data.challengeId).single()
      if (challenge) {
        let winnerId, loserId
        if (data.result === 'Win') {
          winnerId = userId
          loserId = challenge.challenger_id === userId ? challenge.opponent_id : challenge.challenger_id
        } else {
          loserId = userId
          winnerId = challenge.challenger_id === userId ? challenge.opponent_id : challenge.challenger_id
        }
        opponentId = data.result === 'Win' ? loserId : winnerId;
        await updateChallengeStatus(data.challengeId, 'resolved', winnerId)
        await updateRivalry(winnerId, loserId)
      }
    }

    let detailStr = ''
    if (data.genre === 'Racing' && data.stats.track_name) {
      const classStr = data.stats.car_class ? ` ${data.stats.car_class}` : ''
      const hpStr = data.stats.car_hp ? ` ${data.stats.car_hp}HP` : ''
      const carDetail = classStr || hpStr ? ` [${classStr}${hpStr}]`.trim() : ''
      detailStr = ` on ${data.stats.track_name}${carDetail}`
    }
    
    // Activity Feed Entry
    let feedDescription = '';
    const modeLabel = data.isPractice ? '(Practice)' : (data.isAi ? '(vs AI)' : '');
    const grLabel = data.isPractice ? '' : `(${mmrChange > 0 ? '+' : ''}${mmrChange} GR)`;
    
    if (data.result === 'Solo') {
      feedDescription = `Logged Solo Record in ${data.game}${detailStr} [${data.genre}] ${modeLabel} ${grLabel}`.trim();
    } else {
      feedDescription = isWin 
        ? `Victory in ${data.game}${detailStr} [${data.genre}] ${modeLabel} ${grLabel}`.trim()
        : `Defeated in ${data.game}${detailStr} [${data.genre}] ${modeLabel} ${grLabel}`.trim();
    }

    await supabase.from('activity_feed').insert({
      user_id: userId,
      username: profile.username,
      user_avatar: profile.avatar_url,
      event_type: 'match_result',
      description: feedDescription,
    })

    // Update play streak (AEST-aware, non-blocking)
    updatePlayStreak(userId).catch(() => {})

    // 5. CAREER XP & LEVEL PROGRESSION
    let xpEarned = data.result === 'Solo' ? 125 : (isWin ? 150 : 100);
    if (data.isPractice) {
      xpEarned = data.result === 'Solo' ? 35 : (isWin ? 50 : 25); // Small XP for practice
    } else if (data.isAi) {
      xpEarned = isWin ? 25 : 10; // Tiny XP for AI matches
    }
    if (data.challengeId) xpEarned += 50; // Duel bonus

    // RPC call to atomically increment career XP
    await supabase.rpc('award_career_xp', {
      p_user_id: userId,
      p_amount: xpEarned
    });

    // 6. PROMOTION CHECK
    const newTier = getTier(newUsr);
    const isPromotion = (isWin || data.result === 'Solo') && newTier.min > currentTier.min;

    if (isPromotion) {
      // Auto-post promotion to activity feed
      await supabase.from('activity_feed').insert({
        user_id: userId,
        username: profile.username,
        user_avatar: profile.avatar_url,
        event_type: 'promotion',
        description: `has been promoted to ${newTier.name} Tier.`
      })
    }

    // 7. ACHIEVEMENTS EVALUATION
    // Pass updated profile state simulation for evaluation
    const simulatedProfile = data.isPractice ? profile : {
      ...profile,
      wins: profile.wins + (isWin ? 1 : 0),
      losses: profile.losses + (data.result === 'Loss' ? 1 : 0),
      current_streak: isWin ? currentStreak + 1 : (data.result === 'Loss' ? 0 : currentStreak),
      usr: newUsr,
      genre_ratings: newGenreRatings
    };
    const unlockedAchievements = await evaluatePostMatchAchievements(userId, profile.username, simulatedProfile, data, opponentId);

    // If practice mode, we skip overtakes and promotions, but we might return a PB flag
    let isPb = false;
    if (data.isPractice && personalBaseline) {
      if (data.genre === 'Racing') {
        const metricVal = data.stats.best_lap || data.stats.total_time;
        if (metricVal && metricVal < personalBaseline) isPb = true;
      } else if (GENRES[data.genre]?.isHighScore && data.stats.score && data.stats.score > personalBaseline) {
        isPb = true;
      }
    }

    if (data.isPractice) {
      return { 
        success: true, 
        mmrChange: 0, 
        newMmr: currentMmr, 
        newUsr: profile.usr || 1000, 
        isPromotion: false, 
        unlockedAchievements,
        isPb
      };
    }

    // Check if this user's new USR overtook anyone's position
    // Find users with USR just below the new value (they were ahead, now aren't)
    if (isWin) {
      try {
        const { data: overtaken } = await supabase
          .from('profiles')
          .select('id, username, usr')
          .lt('usr', newUsr)
          .gt('usr', profile.usr ?? 0) // was ahead before
          .neq('id', userId)
          .limit(3)

        if (overtaken && overtaken.length > 0) {
          for (const op of overtaken) {
            notifyRankOvertaken(op.id, profile.username, userId).catch(() => {})
          }
        }
      } catch {
        // non-critical
      }
    }

    return { 
      success: true, 
      error: null, 
      newMmr: newGenreRating, 
      mmrChange,
      newUsr,
      isPromotion,
      newTierName: isPromotion ? newTier.name : undefined,
      xpEarned,
      unlockedAchievements
    }
  } catch (err: any) {
    handleServiceError(err, 'matchService');
    
    return { 
      success: false, 
      error: err, 
      newMmr: null, 
      mmrChange: null, 
      newUsr: null,
      isPromotion: false,
      xpEarned: 0,
      unlockedAchievements: []
    }
  }
}

export async function getMatchHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('match_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return { data, error: null }
  } catch (err: any) {
    handleServiceError(err, 'matchService');
    return { data: null, error: err }
  }
}

export async function getLeaderboardStats(genre?: string, game?: string) {
  try {
    let query = supabase
      .from('match_history')
      .select('user_id, result, stats, game, genre, profiles(username, avatar_url, usr, genre_ratings)')

    if (genre && genre !== 'Overall') {
      query = query.eq('genre', genre)
    }
    if (game && game !== 'All') {
      query = query.eq('game', game)
    }

    const { data, error } = await query

    if (error) throw error

    // Aggregate by user
    const userStats: Record<string, any> = {}

    data?.forEach((m: any) => {
      const uid = m.user_id
      if (!userStats[uid]) {
        userStats[uid] = {
          id: uid,
          username: m.profiles?.username || 'Operator',
          avatar_url: m.profiles?.avatar_url,
          usr: m.profiles?.usr || 1000,
          genre_ratings: m.profiles?.genre_ratings || {},
          wins: 0,
          losses: 0,
          total_matches: 0,
          total_kills: 0,
          total_deaths: 0,
          high_score: 0,
          accumulated_score: 0,
        }
      }

      const stats = userStats[uid]
      stats.total_matches++
      if (m.result === 'Win') stats.wins++
      else stats.losses++

      if (m.stats?.kills) stats.total_kills += Number(m.stats.kills)
      if (m.stats?.deaths) stats.total_deaths += Number(m.stats.deaths)
      if (m.stats?.score) {
        stats.high_score = Math.max(stats.high_score, Number(m.stats.score))
        stats.accumulated_score += Number(m.stats.score)
      }
    })

    // Calculate derived metrics
    return Object.values(userStats).map(u => ({
      ...u,
      win_rate: u.total_matches > 0 ? Math.round((u.wins / u.total_matches) * 100) : 0,
      kd_ratio: u.total_deaths > 0 ? Number((u.total_kills / u.total_deaths).toFixed(2)) : u.total_kills,
      avg_score: u.total_matches > 0 ? Math.round(u.accumulated_score / u.total_matches) : 0
    }))

  } catch (err: any) {
    handleServiceError(err, 'matchService');
    
    return []
  }
}

export async function getUniqueGamesPerGenre(genre: string) {
  try {
    const { data, error } = await supabase
      .from('match_history')
      .select('game')
      .eq('genre', genre)
      // Supabase doesn't have a direct distinct on select '*' without extensions, 
      // but we can fetch them and filter in JS for small sets.
    
    if (error) throw error
    const games = Array.from(new Set(data.map(m => m.game)))
    return games
  } catch (err: any) {
    handleServiceError(err, 'matchService');
    return []
  }
}

export async function getUniqueTracksForGame(game: string) {
  try {
    const { data, error } = await supabase
      .from('match_history')
      .select('stats')
      .eq('game', game)
      .eq('genre', 'Racing')
    
    if (error) throw error
    const tracks = new Set<string>()
    data.forEach(m => {
      if (m.stats && m.stats.track_name) tracks.add(m.stats.track_name)
    })
    return Array.from(tracks)
  } catch (err: any) {
    handleServiceError(err, 'matchService');
    return []
  }
}

