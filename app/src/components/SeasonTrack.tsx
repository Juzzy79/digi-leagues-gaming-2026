// src/components/SeasonTrack.tsx
import { Lock, Unlock, ShieldCheck, ChevronRight } from 'lucide-react'

interface RewardTier {
  pointsReq: number;
  title: string;
  type: 'Title' | 'Banner' | 'Dog Tag' | 'Frame';
  icon: any;
}

const SEASON_REWARDS: RewardTier[] = [
  { pointsReq: 100, title: 'Season 1 Contender', type: 'Title', icon: ShieldCheck },
  { pointsReq: 250, title: 'Neon Nights Banner', type: 'Banner', icon: ShieldCheck },
  { pointsReq: 500, title: 'Carbon Fiber Dog Tag', type: 'Dog Tag', icon: ShieldCheck },
  { pointsReq: 1000, title: 'Season 1 Veteran', type: 'Title', icon: ShieldCheck },
  { pointsReq: 2000, title: 'Circuit Champion Frame', type: 'Frame', icon: ShieldCheck },
];

export default function SeasonTrack({ circuitPoints }: { circuitPoints: number }) {
  const currentPoints = circuitPoints || 0;
  
  return (
    <div className="bg-steel-950 border border-steel-700 rounded-lg p-6 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 text-[10px] text-circuit-500/50 uppercase font-mono tracking-widest font-bold rotate-90 origin-top-right translate-x-full translate-y-4">
        Active Circuit
      </div>
      
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-steel-800 pb-4">
        <div>
          <h3 className="text-xs font-display font-bold uppercase text-circuit-400 tracking-widest mb-1">Seasonal Career Track</h3>
          <p className="text-sm font-body text-ink-300">Unlock exclusive cosmetics by earning Circuit Points.</p>
        </div>
        <div className="bg-steel-900 border border-circuit-500/30 px-4 py-2 rounded text-right flex items-center gap-3">
          <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">Current CP</span>
          <span className="text-xl font-display font-black text-circuit-400 italic">{currentPoints}</span>
        </div>
      </div>

      {/* Track progression UI */}
      <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-steel-800">
        {SEASON_REWARDS.map((reward, i) => {
          const isUnlocked = currentPoints >= reward.pointsReq;
          const isNext = !isUnlocked && (i === 0 || currentPoints >= SEASON_REWARDS[i-1].pointsReq);
          
          return (
            <div key={i} className={`relative flex items-center gap-4 p-3 rounded border transition-all ${
              isUnlocked 
                ? 'bg-circuit-900/10 border-circuit-500/50' 
                : isNext 
                  ? 'bg-steel-900 border-circuit-500/20 shadow-[0_0_15px_rgba(20,184,166,0.1)]' 
                  : 'bg-steel-900/50 border-steel-800 opacity-60'
            }`}>
              
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 transition-colors ${
                isUnlocked 
                  ? 'bg-circuit-900 border-circuit-500 text-circuit-400' 
                  : isNext
                    ? 'bg-steel-800 border-circuit-500/50 text-ink-300 animate-pulse'
                    : 'bg-steel-950 border-steel-700 text-steel-600'
              }`}>
                {isUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-end mb-1">
                  <span className={`text-sm font-bold truncate pr-2 ${isUnlocked ? 'text-ink-100' : 'text-ink-400'}`}>
                    {reward.title}
                  </span>
                  <span className={`text-[10px] font-mono font-bold tracking-widest ${isUnlocked ? 'text-circuit-400' : 'text-ink-500'}`}>
                    {reward.pointsReq} CP
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono bg-steel-800 text-ink-400 px-1.5 rounded">
                    {reward.type}
                  </span>
                  
                  {isNext && (
                    <div className="flex-1 h-1 bg-steel-800 rounded overflow-hidden ml-2">
                      <div 
                        className="h-full bg-circuit-500"
                        style={{ 
                          width: `${Math.min(100, Math.max(0, ((currentPoints - (i > 0 ? SEASON_REWARDS[i-1].pointsReq : 0)) / (reward.pointsReq - (i > 0 ? SEASON_REWARDS[i-1].pointsReq : 0))) * 100))}%`
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {isNext && (
                <ChevronRight className="text-circuit-500/50 hidden md:block" size={20} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
