import { handleServiceError } from '../utils/errorHandler';
// src/services/achievementService.ts
import { supabase } from './supabase'

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  tier: string;
}

export interface UserAchievement extends Achievement {
  unlocked_at: string;
}

// Fetch all achievements
export async function getAchievements() {
  try {
    const { data, error } = await supabase.from('achievements').select('*');
    if (error) throw error;
    return { data: data as Achievement[], error: null };
  } catch (err: any) {
    handleServiceError(err, 'achievementService');
    return { data: [], error: err };
  }
}

// Fetch user's unlocked achievements
export async function getUserAchievements(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('unlocked_at, achievements(*)')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;

    const formatted = data.map((d: any) => ({
      ...d.achievements,
      unlocked_at: d.unlocked_at
    })) as UserAchievement[];

    return { data: formatted, error: null };
  } catch (err: any) {
    handleServiceError(err, 'achievementService');
    return { data: [], error: err };
  }
}

// Evaluates match context to unlock achievements
export async function evaluatePostMatchAchievements(
  userId: string,
  username: string,
  profile: any, // current profile state (wins, streak, ratings)
  matchData: any, // { result: 'Win', game: '...', ... }
  opponentId?: string
) {
  const isWin = matchData.result === 'Win';
  const unlockedIds: string[] = [];

  try {
    // We need to fetch the user's currently unlocked achievements to avoid re-unlocking
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);
    
    const unlockedMap = new Set(existing?.map((e: any) => e.achievement_id) || []);

    const unlock = async (achievementId: string, name: string) => {
      if (unlockedMap.has(achievementId)) return;
      
      const { error } = await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievementId
      });

      if (!error) {
        unlockedIds.push(achievementId);
        
        // Post to activity feed
        await supabase.from('activity_feed').insert({
          user_id: userId,
          username,
          event_type: 'achievement_unlocked',
          description: `Unlocked the [${name}] medal.`
        });
        
        // Fire notification
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'achievement_unlocked',
          title: 'Medal Unlocked',
          body: `You earned the ${name} medal.`,
          link: `/app/profile/${userId}`
        });
      }
    };

    // 1. First Blood
    if (isWin && profile.wins === 1 && !unlockedMap.has('first_blood')) {
      await unlock('first_blood', 'First Blood');
    }

    // 2. 10-Streak (Unstoppable)
    if (isWin && profile.current_streak >= 10 && !unlockedMap.has('10_streak')) {
      await unlock('10_streak', 'Unstoppable');
    }

    // 3. Polymath
    if (!unlockedMap.has('polymath')) {
      const genresWithRating = Object.keys(profile.genre_ratings || {}).length;
      if (genresWithRating >= 5) {
        await unlock('polymath', 'Polymath');
      }
    }

    // The next two require opponent context
    if (isWin && opponentId) {
      // 4. Giant Slayer
      if (!unlockedMap.has('giant_slayer')) {
        const { data: oppProfile } = await supabase.from('profiles').select('usr').eq('id', opponentId).single();
        if (oppProfile && oppProfile.usr - profile.usr >= 200) {
          await unlock('giant_slayer', 'Giant Slayer');
        }
      }

      // 5. Redemption
      if (!unlockedMap.has('redemption')) {
        const { data: rivalry } = await supabase
          .from('rivalries')
          .select('is_nemesis')
          .eq('player_id', userId)
          .eq('rival_id', opponentId)
          .single();
        
        if (rivalry && rivalry.is_nemesis) {
          await unlock('redemption', 'Redemption');
        }
      }
    }

    return unlockedIds;
  } catch (err: any) {
    handleServiceError(err, 'achievementService');
    
    return [];
  }
}

