import { supabase } from './supabase'

export interface StreakData {
  playStreak: number
  winStreak: number
  lastPlayDate: string | null
  playedToday: boolean
}

/** Get current streak data for a user */
export async function getStreakData(userId: string): Promise<StreakData> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('play_streak, current_streak, last_play_date')
      .eq('id', userId)
      .single()

    if (!data) return { playStreak: 0, winStreak: 0, lastPlayDate: null, playedToday: false }

    // Check if played today (AEST)
    const now = new Date()
    const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000)
    const todayStr = aest.toISOString().split('T')[0]
    const playedToday = data.last_play_date === todayStr

    return {
      playStreak: data.play_streak ?? 0,
      winStreak: data.current_streak ?? 0,
      lastPlayDate: data.last_play_date ?? null,
      playedToday,
    }
  } catch {
    return { playStreak: 0, winStreak: 0, lastPlayDate: null, playedToday: false }
  }
}

/** Called after any match result is submitted — delegates to DB RPC */
export async function updatePlayStreak(userId: string): Promise<void> {
  try {
    await supabase.rpc('update_play_streak', { p_user_id: userId })
  } catch (err) {
    console.warn('updatePlayStreak RPC failed (non-critical):', err)
  }
}
