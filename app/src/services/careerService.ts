import { handleServiceError } from '../utils/errorHandler';
// src/services/careerService.ts

export interface CareerRank {
  name: string;
  levelRange: [number, number]; // e.g. [1, 9]
  phase: string;
}

export const CAREER_RANKS: CareerRank[] = [
  { name: 'Recruit', levelRange: [1, 9], phase: 'Rookie' },
  { name: 'Operative', levelRange: [10, 19], phase: 'Rookie' },
  { name: 'Specialist', levelRange: [20, 29], phase: 'Rookie' },
  { name: 'Ghost', levelRange: [30, 39], phase: 'Veteran' },
  { name: 'Spectre', levelRange: [40, 49], phase: 'Veteran' },
  { name: 'Phantom', levelRange: [50, 59], phase: 'Veteran' },
  { name: 'Vanguard', levelRange: [60, 69], phase: 'Pro' },
  { name: 'Centurion', levelRange: [70, 79], phase: 'Pro' },
  { name: 'Commander', levelRange: [80, 89], phase: 'Pro' },
  { name: 'Warlord', levelRange: [90, 100], phase: 'Legend' }
];

export const MAX_LEVEL = 100;

// XP required to reach each level.
// Level 1 = 0 XP. 
// Uses an escalating curve: (level - 1)^1.5 * 100
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(Math.pow(level - 1, 1.5) * 100);
}

// Calculate the user's current level based on total XP
export function getLevelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= getXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

export interface CareerProgress {
  level: number;
  rankName: string;
  phaseName: string;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number; // 0 to 100
  isMaxLevel: boolean;
}

export function getCareerProgress(xp: number): CareerProgress {
  const safeXp = Math.max(0, xp);
  const level = getLevelFromXp(safeXp);
  
  const rank = CAREER_RANKS.find(r => level >= r.levelRange[0] && level <= r.levelRange[1]) || CAREER_RANKS[0];
  
  const xpForCurrent = getXpForLevel(level);
  const xpForNext = level < MAX_LEVEL ? getXpForLevel(level + 1) : xpForCurrent;
  
  let progressPercent = 100;
  if (level < MAX_LEVEL) {
    const xpIntoLevel = safeXp - xpForCurrent;
    const xpNeededForNext = xpForNext - xpForCurrent;
    progressPercent = Math.min(100, Math.max(0, (xpIntoLevel / xpNeededForNext) * 100));
  }
  
  return {
    level,
    rankName: rank.name,
    phaseName: rank.phase,
    currentXp: safeXp,
    xpForCurrentLevel: xpForCurrent,
    xpForNextLevel: xpForNext,
    progressPercent,
    isMaxLevel: level === MAX_LEVEL
  };
}

