import { supabase } from './supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DailyOp {
  key: string              // unique key for today, e.g. 'shoot_2_results_2026-06-12'
  title: string            // "Log 2 Shooter results"
  subtitle: string         // "Genre: Shooter · Reward: 50 XP"
  genre: string
  xpReward: number
  targetCount: number
  progressCount: number    // how many the user has done today
  completed: boolean
}

// ── Mission Pool ───────────────────────────────────────────────────────────────

interface MissionTemplate {
  id: string
  title: string
  subtitle: (xp: number) => string
  genre: string
  xpReward: number
  targetCount: number
  /** Filter for counting: genre match OR special rule */
  countFilter: 'any_result' | 'any_win' | 'shooter_result' | 'br_result' | 'racing_result' | 'fighter_result' | 'puzzle_result'
}

const MISSION_POOL: MissionTemplate[] = [
  {
    id: 'shoot_2_results',
    title: 'Hot Lead Protocol',
    subtitle: (xp) => `Log 2 Shooter results  ·  +${xp} XP`,
    genre: 'Shooter',
    xpReward: 50,
    targetCount: 2,
    countFilter: 'shooter_result',
  },
  {
    id: 'br_top5',
    title: 'Storm the Zone',
    subtitle: (xp) => `Record a Battle Royale result  ·  +${xp} XP`,
    genre: 'Battle Royale',
    xpReward: 60,
    targetCount: 1,
    countFilter: 'br_result',
  },
  {
    id: 'racing_lap',
    title: 'Commit a Lap',
    subtitle: (xp) => `Set a lap on the weekly track  ·  +${xp} XP`,
    genre: 'Racing',
    xpReward: 55,
    targetCount: 1,
    countFilter: 'racing_result',
  },
  {
    id: 'win_1',
    title: 'Draw Blood',
    subtitle: (xp) => `Win any match  ·  +${xp} XP`,
    genre: 'Any',
    xpReward: 40,
    targetCount: 1,
    countFilter: 'any_win',
  },
  {
    id: 'fighter_bout',
    title: 'Enter the Pit',
    subtitle: (xp) => `Log a Fighter result  ·  +${xp} XP`,
    genre: 'Fighter',
    xpReward: 45,
    targetCount: 1,
    countFilter: 'fighter_result',
  },
  {
    id: 'puzzle_grind',
    title: 'Cognitive Assault',
    subtitle: (xp) => `Log a Puzzle result  ·  +${xp} XP`,
    genre: 'Puzzle',
    xpReward: 45,
    targetCount: 1,
    countFilter: 'puzzle_result',
  },
  {
    id: 'beat_rival',
    title: 'Eliminate a Rival',
    subtitle: (xp) => `Win against any opponent  ·  +${xp} XP`,
    genre: 'Any',
    xpReward: 70,
    targetCount: 1,
    countFilter: 'any_win',
  },
  {
    id: 'log_3_results',
    title: 'Full Deployment',
    subtitle: (xp) => `Log 3 results in any discipline  ·  +${xp} XP`,
    genre: 'Any',
    xpReward: 80,
    targetCount: 3,
    countFilter: 'any_result',
  },
  {
    id: 'shoot_win',
    title: 'Confirmed Kill',
    subtitle: (xp) => `Win a Shooter match  ·  +${xp} XP`,
    genre: 'Shooter',
    xpReward: 65,
    targetCount: 1,
    countFilter: 'any_win',
  },
]

// ── Deterministic daily rotation ───────────────────────────────────────────────
// Produces a stable, different set of 3 missions each calendar day (AEST).

function getAESTDateString(): string {
  const now = new Date()
  // UTC+10
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000)
  return aest.toISOString().split('T')[0] // 'YYYY-MM-DD'
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function hashDateToSeed(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getTodaysMissionTemplates(): MissionTemplate[] {
  const dateStr = getAESTDateString()
  const seed = hashDateToSeed(dateStr)
  const rand = seededRandom(seed)

  // Shuffle pool
  const pool = [...MISSION_POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, 3)
}

export function getTodaysOpKey(missionId: string): string {
  return `${missionId}_${getAESTDateString()}`
}

// ── Service functions ──────────────────────────────────────────────────────────

/** Fetch today's 3 Daily Ops with real completion progress for this user */
export async function getDailyOps(userId: string): Promise<DailyOp[]> {
  const dateStr = getAESTDateString()
  const templates = getTodaysMissionTemplates()

  // Fetch today's completed op keys for this user
  const { data: completions } = await supabase
    .from('daily_ops_completions')
    .select('op_key')
    .eq('user_id', userId)
    .gte('completed_at', `${dateStr}T00:00:00+10:00`)

  const completedKeys = new Set((completions || []).map((c: any) => c.op_key))

  // Fetch today's match history to calculate progress
  const { data: todayMatches } = await supabase
    .from('match_history')
    .select('genre, result, created_at')
    .eq('user_id', userId)
    .gte('created_at', `${dateStr}T00:00:00+10:00`)

  const matches = todayMatches || []

  const countForFilter = (filter: MissionTemplate['countFilter']) => {
    switch (filter) {
      case 'any_result': return matches.length
      case 'any_win': return matches.filter(m => m.result === 'Win').length
      case 'shooter_result': return matches.filter(m => m.genre === 'Shooter').length
      case 'br_result': return matches.filter(m => m.genre === 'Battle Royale').length
      case 'racing_result': return matches.filter(m => m.genre === 'Racing').length
      case 'fighter_result': return matches.filter(m => m.genre === 'Fighter').length
      case 'puzzle_result': return matches.filter(m => m.genre === 'Puzzle').length
      default: return 0
    }
  }

  return templates.map(t => {
    const opKey = getTodaysOpKey(t.id)
    const progressCount = countForFilter(t.countFilter)
    const meetsProgress = progressCount >= t.targetCount
    const isCompleted = completedKeys.has(opKey) || meetsProgress

    return {
      key: opKey,
      title: t.title,
      subtitle: t.subtitle(t.xpReward),
      genre: t.genre,
      xpReward: t.xpReward,
      targetCount: t.targetCount,
      progressCount: Math.min(progressCount, t.targetCount),
      completed: isCompleted,
    }
  })
}

/** Mark a Daily Op as completed + award Career XP */
export async function completeDailyOp(userId: string, opKey: string, xpAmount: number): Promise<boolean> {
  try {
    // Idempotent insert
    const { error: insertErr } = await supabase
      .from('daily_ops_completions')
      .insert({ user_id: userId, op_key: opKey, xp_awarded: xpAmount })

    if (insertErr && !insertErr.message.includes('duplicate')) throw insertErr

    // Award XP
    await supabase.rpc('award_career_xp', { p_user_id: userId, p_amount: xpAmount })

    return true
  } catch (err) {
    console.warn('completeDailyOp failed:', err)
    return false
  }
}
