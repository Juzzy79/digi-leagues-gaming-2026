import { handleServiceError } from '../utils/errorHandler';
import { supabase } from './supabase'
import type { Profile } from '../context/AuthContext'

export interface FriendConnection {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  created_at: string
}

export interface FriendLeaderboardEntry {
  id: string
  username: string
  avatar_url: string | null
  usr: number
  play_streak: number
  wins: number
  losses: number
  rank: number           // rank within the friend group (1-based)
  delta: number          // USR difference from the current user (positive = ahead)
  isMe: boolean
}

/** Get all accepted friend IDs for a user (both directions) */
export async function getFriendIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('friend_connections')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (!data) return []
  return data.map((c: any) =>
    c.requester_id === userId ? c.addressee_id : c.requester_id
  )
}

/** Get accepted friends as full profiles */
export async function getFriends(userId: string): Promise<Profile[]> {
  const friendIds = await getFriendIds(userId)
  if (friendIds.length === 0) return []

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .in('id', friendIds)

  return data || []
}

/** Leaderboard of friends + self, sorted by USR with delta from current user */
export async function getFriendLeaderboard(userId: string, myUsr: number): Promise<FriendLeaderboardEntry[]> {
  const friendIds = await getFriendIds(userId)
  const allIds = [...friendIds, userId]

  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, usr, play_streak, wins, losses')
    .in('id', allIds)
    .order('usr', { ascending: false })

  if (!data) return []

  return data.map((p: any, idx: number) => ({
    id: p.id,
    username: p.username,
    avatar_url: p.avatar_url,
    usr: p.usr ?? 1000,
    play_streak: p.play_streak ?? 0,
    wins: p.wins ?? 0,
    losses: p.losses ?? 0,
    rank: idx + 1,
    delta: (p.usr ?? 1000) - myUsr,
    isMe: p.id === userId,
  }))
}

/** Get pending requests sent TO this user */
export async function getPendingFriendRequests(userId: string) {
  const { data } = await supabase
    .from('friend_connections')
    .select('id, requester_id, profiles!requester_id(username, avatar_url)')
    .eq('addressee_id', userId)
    .eq('status', 'pending')

  return data || []
}

/** Send a friend request */
export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('friend_connections').insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: 'pending',
    })
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    handleServiceError(err, 'friendService');
    if (err.code === '23505') return { success: false, error: 'Request already sent.' }
    return { success: false, error: err.message }
  }
}

/** Accept a friend request */
export async function acceptFriendRequest(connectionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_connections')
    .update({ status: 'accepted' })
    .eq('id', connectionId)
  return !error
}

/** Check if two users are already connected (any status) */
export async function getConnectionStatus(userA: string, userB: string): Promise<'none' | 'pending' | 'accepted'> {
  const { data } = await supabase
    .from('friend_connections')
    .select('status')
    .or(
      `and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA})`
    )
    .single()

  if (!data) return 'none'
  return data.status as 'pending' | 'accepted'
}

