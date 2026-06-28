import { supabase } from './supabase'
import type { Profile } from '../context/AuthContext'

export async function getAllProfiles(): Promise<{ data: Profile[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('mmr', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err }
  }
}

export async function getProfile(userId: string): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err }
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err }
  }
}
