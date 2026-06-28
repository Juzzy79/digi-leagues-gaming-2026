import { supabase } from './supabase'
import { getProfile } from './profileService'

export interface Insight {
  id: string
  type: 'positive' | 'neutral' | 'warning'
  title: string
  description: string
  metric?: string
}

export async function generatePerformanceDebrief(userId: string): Promise<{ success: boolean, insights?: Insight[], error?: any }> {
  try {
    // Fetch last 30 days of match history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: matches, error } = await supabase
      .from('match_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (!matches || matches.length === 0) {
      return { success: true, insights: [] };
    }

    const insights: Insight[] = [];
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    // Filter matches into this week vs previous 3 weeks
    const thisWeek = matches.filter(m => new Date(m.created_at) >= oneWeekAgo);
    
    // Insight 1: Activity
    if (thisWeek.length > 10) {
      insights.push({
        id: 'high-activity',
        type: 'positive',
        title: 'High Op-Tempo',
        description: `Logged ${thisWeek.length} engagements this week. Consistency builds lethality.`
      });
    }

    // Insight 2: Win Rate
    const winsThisWeek = thisWeek.filter(m => m.result === 'Win').length;
    const wrThisWeek = thisWeek.length > 0 ? (winsThisWeek / thisWeek.length) * 100 : 0;
    
    if (wrThisWeek >= 60 && thisWeek.length >= 3) {
      insights.push({
        id: 'high-winrate',
        type: 'positive',
        title: 'Dominant Cycle',
        description: `Winning ${Math.round(wrThisWeek)}% of your matches over the last 7 days.`,
        metric: `+${winsThisWeek}W`
      });
    } else if (thisWeek.length >= 3 && wrThisWeek <= 30) {
      insights.push({
        id: 'low-winrate',
        type: 'warning',
        title: 'Tactical Slump',
        description: `Only ${Math.round(wrThisWeek)}% win rate recently. Consider logging Unranked Practice to regain flow.`
      });
    }

    // Insight 3: Shooter K/D OR Racing PBs
    // Let's check for shooter K/D trend
    const shooterMatches = thisWeek.filter(m => m.genre === 'Shooter' && m.stats?.kills !== undefined);
    if (shooterMatches.length > 0) {
      const totalKills = shooterMatches.reduce((acc, m) => acc + (m.stats?.kills || 0), 0);
      const totalDeaths = shooterMatches.reduce((acc, m) => acc + (m.stats?.deaths || 1), 0); // avoid div 0
      const kd = totalKills / totalDeaths;
      
      if (kd > 1.5) {
        insights.push({
          id: 'high-kd',
          type: 'positive',
          title: 'Lethal Accuracy',
          description: 'Your K/D is exceptional in recent Shooter deployments.',
          metric: `${kd.toFixed(2)} K/D`
        });
      }
    }

    // Insight 4: Practice conversions
    const practiceMatches = thisWeek.filter(m => m.is_practice);
    if (practiceMatches.length > 0) {
       insights.push({
          id: 'practice-mode',
          type: 'neutral',
          title: 'Training Arc',
          description: `Logged ${practiceMatches.length} practice sessions. Preparation eliminates luck.`
       });
    }

    return { success: true, insights: insights.slice(0, 3) };
  } catch (err) {
    return { success: false, error: err };
  }
}
