// src/components/CareerTimeline.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { getCareerProgress, CareerProgress } from '../services/careerService'
import { Award, ShieldAlert, Trophy, Crosshair, Star } from 'lucide-react'

// Map event types to icons and colors
const EventMeta: Record<string, any> = {
  promotion: { icon: ShieldAlert, color: 'text-pulse-400', bg: 'bg-pulse-900/20 border-pulse-500' },
  achievement_unlocked: { icon: Award, color: 'text-rank-gold', bg: 'bg-rank-gold/10 border-rank-gold' },
  tournament_win: { icon: Trophy, color: 'text-nexus-400', bg: 'bg-nexus-900/20 border-nexus-400' },
  nemesis_event: { icon: Crosshair, color: 'text-threat-500', bg: 'bg-threat-900/20 border-threat-500' },
  default: { icon: Star, color: 'text-ink-400', bg: 'bg-steel-800 border-steel-600' }
}

export default function CareerTimeline({ userId }: { userId: string }) {
  const [events, setEvents] = useState<any[]>([])
  const [progress, setProgress] = useState<CareerProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: feedData } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', userId)
        .in('event_type', ['promotion', 'achievement_unlocked', 'tournament_win', 'nemesis_event'])
        .order('created_at', { ascending: false })
        .limit(20)

      setEvents(feedData || [])

      const { data: profile } = await supabase
        .from('profiles')
        .select('career_xp')
        .eq('id', userId)
        .single()
      
      if (profile) {
        setProgress(getCareerProgress(profile.career_xp || 0))
      }

      setLoading(false)
    }

    fetchData()
  }, [userId])

  if (loading) return (
    <div className="animate-pulse bg-steel-950 border border-steel-700 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
      <span className="font-mono text-xs text-nexus-400">LOADING TIMELINE...</span>
    </div>
  )

  return (
    <div className="bg-steel-950 border border-steel-700 rounded-lg p-6 shadow-2xl relative">
      <div className="flex justify-between items-end mb-6">
        <h3 className="text-xs font-display font-bold uppercase text-ink-100 tracking-widest">Career Timeline</h3>
        {progress && (
          <div className="text-right">
            <p className="text-sm font-bold text-nexus-400 uppercase tracking-widest">{progress.phaseName} PHASE</p>
            <p className="text-[10px] text-ink-400 uppercase">{progress.rankName} - Level {progress.level}</p>
          </div>
        )}
      </div>
      
      {events.length === 0 ? (
        <div className="text-center py-8 border-t border-steel-800">
          <p className="text-[10px] font-mono text-ink-600 uppercase">The ledger awaits your first major milestone.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-steel-800 ml-4 space-y-8">
          {events.map((e) => {
            const meta = EventMeta[e.event_type] || EventMeta.default;
            const Icon = meta.icon;
            
            return (
              <div key={e.id} className="relative pl-8">
                {/* Timeline Node */}
                <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-steel-950 ${meta.color} ${meta.bg.split(' ')[1]}`}>
                  <Icon size={14} />
                </div>
                
                <div className={`p-4 rounded border ${meta.bg} relative`}>
                  <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" />
                  <p className="text-sm font-body text-ink-100 mb-1">
                    <span className="font-bold">{e.username}</span> {e.description}
                  </p>
                  <p className="text-[10px] font-mono uppercase text-ink-500">
                    {new Date(e.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
