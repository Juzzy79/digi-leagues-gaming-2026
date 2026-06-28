export interface Tier {
  name: string;
  colorClass: string;
  min: number;
  max: number;
}

export const TIERS: Tier[] = [
  { name: 'Iron',        colorClass: 'text-[#8B9BB0]', min: 0,    max: 999 },
  { name: 'Bronze',      colorClass: 'text-rank-bronze', min: 1000, max: 1199 },
  { name: 'Silver',      colorClass: 'text-rank-silver', min: 1200, max: 1399 },
  { name: 'Gold',        colorClass: 'text-rank-gold',   min: 1400, max: 1599 },
  { name: 'Platinum',    colorClass: 'text-pulse-500',   min: 1600, max: 1799 },
  { name: 'Diamond',     colorClass: 'text-nexus-400',   min: 1800, max: 1999 },
  { name: 'Nexus Elite', colorClass: 'text-circuit-500', min: 2000, max: 99999 },
];

export interface GenreConfig {
  name: string;
  weight: number;
  statsFields: string[]; // Fields to show in the form
  isHighScore?: boolean; // If true, uses baseline/sliding scale logic
}

export const GENRES: Record<string, GenreConfig> = {
  'Shooter': { 
    name: 'Shooter', 
    weight: 1.0, 
    statsFields: ['position', 'kills', 'deaths'] 
  },
  'Battle Royale': { 
    name: 'Battle Royale', 
    weight: 1.2, 
    statsFields: ['position', 'kills', 'damage'] 
  },
  'Racing': { 
    name: 'Racing', 
    weight: 0.8, 
    statsFields: ['position', 'best_lap', 'total_time'] 
  },
  'Puzzle': { 
    name: 'Puzzle', 
    weight: 0.5, 
    statsFields: ['score', 'time_taken'],
    isHighScore: true
  },
  'Fighter': { 
    name: 'Fighter', 
    weight: 1.0, 
    statsFields: ['wins_in_set', 'perfect_rounds'] 
  }
};

export function getTier(mmr: number): Tier {
  const safeMmr = Math.max(0, mmr);
  return TIERS.find(t => safeMmr >= t.min && safeMmr <= t.max) || TIERS[0];
}

export function getNextTier(mmr: number): Tier | null {
  const currentTierIndex = TIERS.findIndex(t => mmr >= t.min && mmr <= t.max);
  if (currentTierIndex >= 0 && currentTierIndex < TIERS.length - 1) {
    return TIERS[currentTierIndex + 1];
  }
  return null;
}

/**
 * Normalizes raw stats into a 0.0 - 2.0 Performance Index.
 * @param genre The genre of the game
 * @param stats The raw stats object
 * @param baseline The player's baseline (if high score game) or global average
 */
export function normalizePerformance(genre: string, stats: any, baselines?: { community?: number, personal?: number }): number {
  const config = GENRES[genre];
  if (!config) return 1.0; // Default average

  if (config.isHighScore && stats.score !== undefined) {
    let communityIndex = 1.0;
    if (baselines?.community && baselines.community > 0) {
      communityIndex = Math.min(2.0, stats.score / baselines.community);
    }
    
    let personalIndex = 1.0;
    if (baselines?.personal && baselines.personal > 0) {
      personalIndex = Math.min(2.0, stats.score / baselines.personal);
    }

    // Blend: 70% Community, 30% Personal
    return (communityIndex * 0.7) + (personalIndex * 0.3);
  }

  // FPS logic: K/D ratio and position normalized
  if (genre === 'Shooter') {
    let kdIndex = 1.0;
    if (stats.kills !== undefined && stats.deaths !== undefined) {
      const kd = stats.kills / Math.max(1, stats.deaths);
      kdIndex = Math.min(2.0, kd / 1.5); // 1.5 K/D is the "1.0" standard
    }
    
    let positionIndex = 1.0;
    if (stats.position !== undefined && stats.position > 0) {
      // 1st place = 2.0, 2nd = 1.5, 3rd = 1.0, 4th = 0.5, >4 = 0.1
      positionIndex = Math.max(0.1, 2.0 - ((stats.position - 1) * 0.5));
    } else {
      // If position is omitted, fallback entirely to K/D
      return kdIndex;
    }

    // Blend: 60% Position, 40% K/D
    return (positionIndex * 0.6) + (kdIndex * 0.4);
  }

  // Battle Royale logic: Position based
  if (genre === 'Battle Royale' && stats.position !== undefined) {
    // 1st place in 100 players = 2.0, 50th = 1.0, 100th = 0.1
    return Math.max(0.1, (101 - stats.position) / 50);
  }

  return 1.0;
}

/**
 * Calculates a new Genre Rating based on performance.
 */
export function calculateMMRChange(
  _currentRating: number, 
  performanceIndex: number, 
  result: 'Win' | 'Loss' | 'Solo',
  streak = 0,
  teammates?: any[],
  isAi?: boolean
): number {
  const K = 32; // Development coefficient
  const expectedPerformance = 1.0; // We expect "average" performance
  
  // Basic Elo-style update based on performance vs expectation
  let change = K * (performanceIndex - expectedPerformance);
  
  // Win/Loss bonus/penalty (ensure winning always helps, losing always costs)
  if (result === 'Win' && change < 5) change = 5; 
  if (result === 'Loss') {
    // Option A: Allow small gain if absolutely carrying, but cap the gain so losing isn't too rewarding
    if (change > 5) change = 5; 
  }

  // Streak bonus
  if (result === 'Win' && streak > 0) {
    change += Math.min(streak * 2, 10);
  }

  // Co-Op Team Cohesion Multiplier
  if (teammates && teammates.length > 0 && result !== 'Solo') {
    let totalKills = 0;
    let totalDeaths = 0;
    teammates.forEach((tm: any) => {
      totalKills += parseInt(tm.kills) || 0;
      totalDeaths += parseInt(tm.deaths) || 0;
    });
    
    const squadKd = totalDeaths === 0 ? totalKills : totalKills / totalDeaths;
    
    if (result === 'Win' && squadKd >= 1.2) {
       // Elite team performance! Boost positive gain by 20%
       if (change > 0) {
         change *= 1.2;
       }
    } else if (result === 'Loss' && squadKd < 0.5) {
       // Horrible team performance. Penalize negative change further.
       if (change < 0) {
         change *= 1.1; 
       }
    }
  }

  // AI Opponent Modifier
  if (isAi) {
    change *= 0.1; // 10% of standard change
    if (change > 0 && change > 2) change = 2; // Cap gain at +2
    if (change < 0 && change < -2) change = -2; // Cap loss at -2
    if (change > 0 && change < 1) change = 1; // Minimum gain +1
    if (change < 0 && change > -1) change = -1; // Minimum loss -1
  }

  return Math.round(change);
}

/**
 * Calculates the Universal Skill Rating (USR).
 * Formula: (Avg(Top 3 Genres) * 0.7) + (Avg(All Genres) * 0.3)
 */
export function calculateUSR(genreRatings: Record<string, number>): number {
  const ratings = Object.values(genreRatings);
  if (ratings.length === 0) return 0;

  const sorted = [...ratings].sort((a, b) => b - a);
  const top3 = sorted.slice(0, 3);
  const avgTop3 = top3.reduce((a, b) => a + b, 0) / top3.length;
  const avgAll = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  return Math.round((avgTop3 * 0.7) + (avgAll * 0.3));
}
