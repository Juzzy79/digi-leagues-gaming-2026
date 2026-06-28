import { supabase } from './supabase'

export interface Notification {
  id: string
  user_id: string
  type:
    | 'challenge_received'
    | 'rank_overtaken'
    | 'dog_tag_at_risk'
    | 'tournament_starting'
    | 'weekly_track_beaten'
    | 'daily_op_complete'
    | 'streak_reminder'
  title: string
  body: string
  link: string | null
  is_read: boolean
  created_at: string
}

export async function getNotifications(userId: string): Promise<{ data: Notification[]; unreadCount: number }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    const unreadCount = (data || []).filter(n => !n.is_read).length
    return { data: data || [], unreadCount }
  } catch {
    return { data: [], unreadCount: 0 }
  }
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
}

export async function createNotification(data: Omit<Notification, 'id' | 'is_read' | 'created_at'>): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link ?? null,
    })
  } catch (err) {
    console.warn('Notification insert failed (non-critical):', err)
  }
}

/** Convenience helpers for each notification type */
export async function notifyChallengeReceived(opponentId: string, challengerName: string, game: string) {
  return createNotification({
    user_id: opponentId,
    type: 'challenge_received',
    title: 'COMBAT REQUEST RECEIVED',
    body: `${challengerName} has issued a challenge in ${game}. Respond before it expires.`,
    link: '/app/dashboard',
  })
}

export async function notifyRankOvertaken(userId: string, overtakerName: string, overtakerId: string) {
  return createNotification({
    user_id: userId,
    type: 'rank_overtaken',
    title: 'YOUR RANK HAS BEEN BREACHED',
    body: `${overtakerName} just overtook your position on the leaderboard. Retaliate.`,
    link: `/app/versus/${overtakerId}`,
  })
}

export async function notifyDogTagAtRisk(userId: string, challengerName: string) {
  return createNotification({
    user_id: userId,
    type: 'dog_tag_at_risk',
    title: 'DOG TAG UNDER THREAT',
    body: `${challengerName} is closing in on your dog tag. One more loss and it's theirs.`,
    link: '/app/leaderboard',
  })
}

export async function notifyWeeklyTrackBeaten(userId: string, beaterName: string, track: string) {
  return createNotification({
    user_id: userId,
    type: 'weekly_track_beaten',
    title: 'LAP TIME DETHRONED',
    body: `${beaterName} just set a faster time on ${track}. Reclaim the top spot.`,
    link: '/app/leaderboard',
  })
}

export async function notifyTournamentStarting(userId: string, tournamentName: string) {
  return createNotification({
    user_id: userId,
    type: 'tournament_starting',
    title: 'TOURNAMENT COMMENCING',
    body: `${tournamentName} is about to begin. Check your bracket.`,
    link: '/app/tournaments',
  })
}
