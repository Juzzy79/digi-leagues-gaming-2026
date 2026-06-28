import { handleServiceError } from '../utils/errorHandler';
import { supabase } from './supabase'

export interface Circuit {
  id: string;
  name: string;
  season: string;
  start_date: string;
  end_date: string;
  background_url: string | null;
  description: string | null;
  is_manual: boolean;
  status: 'upcoming' | 'active' | 'completed';
  created_at: string;
}

export async function getActiveCircuits() {
  try {
    const { data, error } = await supabase
      .from('circuits')
      .select('*')
      .in('status', ['active', 'upcoming'])
      .order('start_date', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'circuitService');
    return { data: [], error: err };
  }
}

export async function getCircuit(id: string) {
  try {
    const { data, error } = await supabase
      .from('circuits')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'circuitService');
    return { data: null, error: err };
  }
}

export async function createCircuit(circuit: Partial<Circuit>) {
  try {
    const { data, error } = await supabase
      .from('circuits')
      .insert(circuit)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'circuitService');
    return { success: false, data: null, error: err };
  }
}

export async function updateCircuitStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('circuits')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'circuitService');
    return { success: false, data: null, error: err };
  }
}

export async function getCircuitStandings(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, usr')
      .order('usr', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    handleServiceError(err, 'circuitService');
    return { data: [], error: err };
  }
}

export async function deleteCircuit(id: string) {
  try {
    // 1. Delete tournaments belonging to this circuit
    const { error: tError } = await supabase
      .from('tournaments')
      .delete()
      .eq('circuit_id', id);
    if (tError) throw tError;

    // 2. Delete sessions belonging to this circuit
    const { error: sError } = await supabase
      .from('sessions')
      .delete()
      .eq('circuit_id', id);
    if (sError) throw sError;

    // 3. Delete the circuit itself
    const { error } = await supabase
      .from('circuits')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    handleServiceError(err, 'circuitService');
    return { success: false, error: err };
  }
}

