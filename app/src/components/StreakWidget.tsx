import { Flame, Swords } from 'lucide-react'

interface StreakWidgetProps {
  playStreak: number
  winStreak: number
  compact?: boolean
}

export default function StreakWidget({ playStreak, winStreak, compact = false }: StreakWidgetProps) {
  if (playStreak === 0 && winStreak === 0) return null

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {playStreak >= 3 && (
          <span title={`${playStreak}-day play streak`} className="flex items-center gap-0.5 text-orange-400 text-xs font-mono font-bold">
            <Flame size={12} /> {playStreak}
          </span>
        )}
        {winStreak >= 3 && (
          <span title={`${winStreak}-win streak`} className="flex items-center gap-0.5 text-victory-500 text-xs font-mono font-bold">
            <Swords size={12} /> W{winStreak}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {playStreak > 0 && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold ${
          playStreak >= 7
            ? 'bg-orange-950/60 border-orange-400/50 text-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.3)]'
            : playStreak >= 3
            ? 'bg-orange-950/30 border-orange-500/30 text-orange-400'
            : 'bg-steel-800 border-steel-700 text-ink-400'
        }`}>
          <Flame size={14} className={playStreak >= 3 ? 'text-orange-400' : 'text-ink-600'} />
          <span>{playStreak}d</span>
          <span className="text-[9px] uppercase tracking-widest opacity-60 hidden sm:inline">play streak</span>
        </div>
      )}
      {winStreak >= 2 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-victory-900/20 border-victory-500/30 text-victory-400 text-xs font-mono font-bold">
          <Swords size={14} />
          <span>W{winStreak}</span>
          <span className="text-[9px] uppercase tracking-widest opacity-60 hidden sm:inline">win streak</span>
        </div>
      )}
    </div>
  )
}
