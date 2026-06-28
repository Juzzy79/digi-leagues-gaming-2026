import { supabase } from './supabase'

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null; // null means public channel message
  content: string;
  created_at: string;
  sender_name?: string;
}

export async function getGeneralMessages(limit: number = 50) {
  return getMessages('general', limit);
}

export async function getMessages(channel: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Reverse to chronological order
    const mapped = (data || []).map(row => ({
      ...row,
      sender_name: row.sender_name || 'Unknown',
      avatar_url: null 
    })).reverse();
    
    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: [], error: err };
  }
}

export async function sendGeneralMessage(userId: string, username: string, content: string) {
  return sendMessage(userId, username, content, 'general');
}

export async function sendMessage(userId: string, username: string, content: string, channel: string) {
  try {
    if (!content.trim()) throw new Error("Message content cannot be empty.");
    
    const { data, error } = await supabase
      .from('messages')
      .insert({ 
        sender_id: userId, 
        sender_name: username,
        content, 
        channel
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (err: any) {
    console.error("sendMessage catch block:", err);
    return { success: false, data: null, error: err };
  }
}
