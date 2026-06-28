import { supabase } from './supabase'

export interface Goal {
  id: string
  user_id: string
  title: string
  target_tier?: string
  target_usr?: number
  deadline?: string
  status: 'active' | 'achieved' | 'failed'
  created_at: string
}

export async function getActiveGoal(userId: string): Promise<{ data: Goal | null, error?: any }> {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is no rows
    return { data: data || null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function createGoal(userId: string, title: string, targetUsr?: number, targetTier?: string, deadline?: string) {
  try {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title,
        target_usr: targetUsr,
        target_tier: targetTier,
        deadline
      })
      .select()
      .single()
      
    if (error) throw error
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err }
  }
}

export async function updateGoalStatus(goalId: string, status: 'achieved' | 'failed') {
  try {
    const { error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: err }
  }
}
