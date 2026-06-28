import { handleServiceError } from '../utils/errorHandler';
// src/services/crewService.ts
import { supabase } from './supabase'

export interface Crew {
  id: string;
  name: string;
  tag: string;
  owner_id: string;
  created_at: string;
}

export interface CrewMember {
  crew_id: string;
  user_id: string;
  joined_at: string;
  profiles: {
    username: string;
    avatar_url: string;
    usr: number;
    career_xp: number;
  };
}

export async function createCrew(userId: string, name: string, tag: string) {
  try {
    const { data: crew, error } = await supabase
      .from('crews')
      .insert({ name, tag, owner_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Add owner as a member
    const { error: memError } = await supabase
      .from('crew_members')
      .insert({ crew_id: crew.id, user_id: userId });

    if (memError) throw memError;

    return { success: true, data: crew, error: null };
  } catch (err: any) {
    handleServiceError(err, 'crewService');
    return { success: false, data: null, error: err };
  }
}

export async function joinCrew(userId: string, crewId: string) {
  try {
    const { error } = await supabase
      .from('crew_members')
      .insert({ crew_id: crewId, user_id: userId });

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    handleServiceError(err, 'crewService');
    return { success: false, error: err };
  }
}

export async function getUserCrew(userId: string) {
  try {
    const { data, error } = await supabase
      .from('crew_members')
      .select('crews(*)')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return { data: data?.crews as Crew | undefined, error: null };
  } catch (err: any) {
    handleServiceError(err, 'crewService');
    return { data: null, error: err };
  }
}

export async function getCrewMembers(crewId: string) {
  try {
    const { data, error } = await supabase
      .from('crew_members')
      .select('crew_id, user_id, joined_at, profiles(username, avatar_url, usr, career_xp)')
      .eq('crew_id', crewId);

    if (error) throw error;
    
    // Sort by USR descending
    const sorted = (data as any[]).sort((a, b) => (b.profiles.usr || 0) - (a.profiles.usr || 0));
    return { data: sorted as CrewMember[], error: null };
  } catch (err: any) {
    handleServiceError(err, 'crewService');
    return { data: [], error: err };
  }
}

