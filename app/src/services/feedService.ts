import { handleServiceError } from '../utils/errorHandler';
import { supabase } from './supabase'

export async function getFeed(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (err: any) {
    handleServiceError(err, 'feedService');
    return { data: null, error: err }
  }
}

