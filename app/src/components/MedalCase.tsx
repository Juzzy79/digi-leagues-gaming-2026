// src/components/MedalCase.tsx
import { useEffect, useState } from 'react'
import { getUserAchievements } from '../services/achievementService'
import type { UserAchievement } from '../services/achievementService'
import { Award, Sword, Flame, ShieldAlert, BrainCircuit, HeartCrack, Lock } from 'lucide-react'

// Map of string icons to Lucide components
const IconMap: Record<string, any> = {
  Sword,
  Flame,
  ShieldAlert,
  BrainCircuit,
  BrokenHeart: HeartCrack,
  Award
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'text-rank-bronze border-rank-bronze bg-rank-bronze/10',
  silver: 'text-rank-silver border-rank-silver bg-rank-silver/10',
  gold: 'text-rank-gold border-rank-gold bg-rank-gold/10',
  platinum: 'text-pulse-400 border-pulse-500 bg-pulse-900/20',
  diamond: 'text-nexus-400 border-nexus-400 bg-nexus-900/20'
}

export default function MedalCase({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<UserAchievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserAchievements(userId).then(({ data }) => {
      setAchievements(data || [])
      setLoading(false)
    })
  }, [userId])

  if (loading) return (
    <div className="animate-pulse bg-steel-950 border border-steel-700 rounded-lg p-6 h-32 flex items-center justify-center">
      <span className="font-mono text-xs text-nexus-400">LOADING MEDAL CASE...</span>
    </div>
  )

  if (achievements.length === 0) return (
    <div className="bg-steel-950 border border-steel-700 rounded-lg p-6 text-center shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay"></div>
      <h3 className="text-xs font-display font-bold uppercase text-ink-500 tracking-widest mb-4">Medal Case</h3>
      <div className="w-16 h-16 mx-auto bg-steel-900 rounded-full border-2 border-dashed border-steel-700 flex items-center justify-center text-steel-600 mb-2">
        <Lock size={24} />
      </div>
      <p className="text-[10px] uppercase font-mono text-ink-600">No medals earned yet</p>
    </div>
  )

  return (
    <div className="bg-steel-950 border border-steel-700 rounded-lg p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay"></div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-xs font-display font-bold uppercase text-ink-100 tracking-widest flex items-center gap-2">
          <Award size={16} className="text-nexus-400" /> Medal Case
        </h3>
        <span className="text-[10px] font-mono text-nexus-400 font-bold bg-nexus-900/30 px-2 py-0.5 rounded border border-nexus-500/30">
          {achievements.length} UNLOCKED
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
        {achievements.map((a) => {
          const Icon = IconMap[a.icon_name] || Award;
          const style = TIER_COLORS[a.tier] || TIER_COLORS.bronze;

          return (
            <div key={a.id} className="relative group cursor-default">
              <div className={`p-4 rounded border-2 flex flex-col items-center justify-center gap-2 transition-all group-hover:scale-105 ${style}`}>
                <Icon size={32} className="drop-shadow-md" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-center mt-2 leading-tight">
                  {a.name}
                </span>
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-steel-900 border border-steel-600 p-3 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="text-xs font-bold text-ink-100 mb-1">{a.name}</div>
                <div className="text-[10px] text-ink-400 leading-snug">{a.description}</div>
                <div className="mt-2 text-[8px] text-nexus-500 font-mono uppercase">
                  Unlocked: {new Date(a.unlocked_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
