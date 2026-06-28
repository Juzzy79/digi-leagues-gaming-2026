import { supabase } from './supabase'


export interface Session {
  id: string
  circuit_id: string | null
  creator_id: string
  name: string
  game: string
  point_scale: Record<string, number>
  max_games: number
  current_game: number
  status: 'pending' | 'active' | 'completed'
  created_at: string
}

export interface SessionParticipant {
  session_id: string
  player_id: string
  total_points: number
  rank_in_session?: number
  profiles?: {
    username: string
    avatar_url: string | null
  }
}

export const sessionService = {
  // 1. Session Lifecycle
  async createSession(session: Partial<Session>) {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single()
    return { data, error, success: !error }
  },

  async getSession(id: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, circuits(name)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async getSessionsByCircuit(circuitId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('circuit_id', circuitId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // 2. Participant Management (Check-in)
  async joinSession(sessionId: string, playerId: string) {
    const { data, error } = await supabase
      .from('session_participants')
      .insert({ session_id: sessionId, player_id: playerId })
      .select()
      .single()
    return { data, error, success: !error }
  },

  async getParticipants(sessionId: string) {
    const { data, error } = await supabase
      .from('session_participants')
      .select('*, profiles(username, avatar_url)')
      .eq('session_id', sessionId)
      .order('total_points', { ascending: false })
    return { data: data as SessionParticipant[], error }
  },

  // 3. Game / Placement Recording
  async recordGameResult(sessionId: string, gameNumber: number, placements: Record<string, number>) {
    // 1. Insert the game record
    const { error: gameError } = await supabase
      .from('session_games')
      .insert({
        session_id: sessionId,
        game_number: gameNumber,
        placements
      })

    if (gameError) return { success: false, error: gameError }

    // 2. Update session metadata (current_game)
    await supabase
      .from('sessions')
      .update({ current_game: gameNumber })
      .eq('id', sessionId)

    // 3. Batch update participant totals
    // In a real app, we might use a trigger, but for "Friday Night Velocity" 
    // we'll calculate scales here and upsert.
    const { data: session } = await this.getSession(sessionId)
    const scale = session?.point_scale || { "1": 10, "2": 5, "3": 2 }

    for (const [playerId, rank] of Object.entries(placements)) {
      const points = (scale as any)[rank.toString()] || 0
      if (points > 0) {
        // Increment total_points in DB
        await supabase.rpc('increment_session_points', { 
          s_id: sessionId, 
          p_id: playerId, 
          pts: points 
        })
      }
    }

    return { success: true }
  },

  // 4. Finalization
  async finalizeSession(sessionId: string) {
    const { data: participants } = await this.getParticipants(sessionId)
    if (!participants) return { success: false }

    // Update session status
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)

    if (error) return { success: false, error }

    return { success: true }
  },

  async getJoinedSessions(playerId: string) {
    const { data, error } = await supabase
      .from('session_participants')
      .select(`
        session_id,
        sessions (
          id,
          name,
          game,
          status,
          circuit_id,
          circuits (
            name
          )
        )
      `)
      .eq('player_id', playerId)
      .neq('sessions.status', 'completed');
    
    return { data, error };
  },

  async getAllSessions() {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, circuits(name)')
      .order('created_at', { ascending: false });
    return { data, error };
  }
}
