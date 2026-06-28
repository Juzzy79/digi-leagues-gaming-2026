import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { getSession } from '../services/authService'

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  banner_url: string | null
  main_game: string
  mmr: number
  usr: number // Universal Skill Rating
  genre_ratings: Record<string, { rating: number, baseline: number | null }> | null
  wins: number
  losses: number
  win_rate: number
  current_streak: number
  reputation_score: number
  circuit_points: number
  is_admin: boolean
  is_trusted: boolean
  is_founder: boolean
  founder_number: number | null
  last_active: string
  created_at: string
  career_xp?: number
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  setProfile: (p: Profile | null) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Effect 1: session listener — runs once on mount
  useEffect(() => {
    getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, []) // ← empty deps, fires once

  // Effect 2: profile fetch — dep is user.id (primitive), safe
  useEffect(() => {
    if (!user?.id) { setProfile(null); return }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [user?.id]) // ← primitive, no infinite loop

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
