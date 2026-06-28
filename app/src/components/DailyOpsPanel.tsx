import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Flame, Zap } from 'lucide-react'
import { getDailyOps, completeDailyOp } from '../services/dailyOpsService'
import type { DailyOp } from '../services/dailyOpsService'
import { useAuth } from '../context/AuthContext'
import { getStreakData } from '../services/streakService'
import type { StreakData } from '../services/streakService'

const GENRE_COLOUR: Record<string, string> = {
  Shooter: 'text-duel-500 bg-duel-900/20 border-duel-500/30',
  'Battle Royale': 'text-threat-500 bg-threat-900/20 border-threat-500/30',
  Racing: 'text-nexus-400 bg-nexus-900/20 border-nexus-500/30',
  Fighter: 'text-circuit-500 bg-circuit-900/20 border-circuit-500/30',
  Puzzle: 'text-rank-gold bg-yellow-950/20 border-yellow-500/20',
  Any: 'text-pulse-400 bg-pulse-900/20 border-pulse-500/30',
}

export default function DailyOpsPanel() {
  const { user } = useAuth()
  const [ops, setOps] = useState<DailyOp[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    Promise.all([
      getDailyOps(user.id),
      getStreakData(user.id),
    ]).then(([opsData, streakData]) => {
      if (cancelled) return
      setOps(opsData)
      setStreak(streakData)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [user?.id])

  const handleClaim = async (op: DailyOp) => {
    if (!user?.id || op.completed || completing) return
    if (op.progressCount < op.targetCount) return
    setCompleting(op.key)
    const success = await completeDailyOp(user.id, op.key, op.xpReward)
    if (success) {
      setOps(prev => prev.map(o => o.key === op.key ? { ...o, completed: true } : o))
    }
    setCompleting(null)
  }

  // Streak warning — show loss-aversion banner if streak ≥ 3 and haven't played today
  const showStreakWarning = streak && streak.playStreak >= 3 && !streak.playedToday
  const completedToday = ops.filter(o => o.completed).length
  const totalXp = ops.filter(o => o.completed).reduce((sum, o) => sum + o.xpReward, 0)

  return (
    <div className="bg-steel-900 border border-steel-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-steel-950 to-steel-900 border-b border-steel-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-nexus-900/50 border border-nexus-500/30 flex items-center justify-center">
            <Zap size={16} className="text-nexus-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-100">Daily Ops</h3>
            <p className="text-[10px] font-mono text-ink-500 uppercase tracking-wider">
              {completedToday}/3 complete · {totalXp > 0 ? `+${totalXp} XP earned` : 'Mission briefing active'}
            </p>
          </div>
        </div>

        {/* Streak badge */}
        {streak && streak.playStreak > 0 && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold ${
            streak.playStreak >= 3
              ? 'bg-orange-950/40 border-orange-500/40 text-orange-400'
              : 'bg-steel-800 border-steel-600 text-ink-400'
          }`}>
            <Flame size={13} className={streak.playStreak >= 3 ? 'text-orange-400' : 'text-ink-500'} />
            {streak.playStreak}d streak
          </div>
        )}
      </div>

      {/* Streak warning — loss-aversion */}
      {showStreakWarning && (
        <div className="flex items-center gap-3 bg-orange-950/30 border-b border-orange-500/30 px-5 py-3">
          <Flame size={18} className="text-orange-400 flex-shrink-0 animate-pulse" />
          <p className="text-xs font-body text-orange-300">
            <strong className="font-mono uppercase tracking-wider">Don't break it!</strong>{' '}
            Play today to keep your <strong>{streak?.playStreak}-day streak</strong> alive.
          </p>
        </div>
      )}

      {/* Ops list */}
      <div className="divide-y divide-steel-800">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded bg-steel-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-steel-800 rounded w-2/3" />
                <div className="h-2.5 bg-steel-800 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : (
          ops.map((op) => {
            const progress = op.targetCount > 1
              ? op.progressCount / op.targetCount
              : op.completed ? 1 : op.progressCount > 0 ? 0.5 : 0
            const canClaim = op.progressCount >= op.targetCount && !op.completed
            const colourClass = GENRE_COLOUR[op.genre] ?? GENRE_COLOUR['Any']

            return (
              <div
                key={op.key}
                className={`px-5 py-4 flex items-center gap-4 transition-all ${
                  op.completed
                    ? 'opacity-60'
                    : canClaim
                    ? 'bg-victory-900/10 hover:bg-victory-900/20'
                    : 'hover:bg-steel-800/30'
                }`}
              >
                {/* Status icon */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${
                  op.completed
                    ? 'bg-victory-900/30 border-victory-500/50'
                    : canClaim
                    ? 'bg-victory-900/20 border-victory-500/30 animate-pulse'
                    : 'bg-steel-800 border-steel-700'
                }`}>
                  {op.completed
                    ? <CheckCircle2 size={16} className="text-victory-500" />
                    : <Circle size={16} className="text-ink-600" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-xs font-mono font-bold uppercase tracking-wider ${op.completed ? 'line-through text-ink-600' : 'text-ink-100'}`}>
                      {op.title}
                    </p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${colourClass}`}>
                      {op.genre}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-ink-500 uppercase tracking-wider">{op.subtitle}</p>

                  {/* Progress bar (for multi-count missions) */}
                  {op.targetCount > 1 && (
                    <div className="mt-2 h-1 bg-steel-800 rounded-full overflow-hidden w-full max-w-[180px]">
                      <div
                        className="h-full bg-gradient-to-r from-nexus-500 to-pulse-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, progress * 100)}%` }}
                      />
                    </div>
                  )}
                  {op.targetCount > 1 && (
                    <p className="text-[9px] font-mono text-ink-600 mt-1">{op.progressCount}/{op.targetCount}</p>
                  )}
                </div>

                {/* XP badge / Claim button */}
                <div className="flex-shrink-0">
                  {canClaim ? (
                    <button
                      onClick={() => handleClaim(op)}
                      disabled={completing === op.key}
                      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-victory-500/20 hover:bg-victory-500/40 text-victory-400 border border-victory-500/40 rounded transition-all disabled:opacity-50"
                    >
                      {completing === op.key ? 'CLAIMING...' : 'CLAIM XP'}
                    </button>
                  ) : (
                    <div className={`px-2.5 py-1 rounded border text-[10px] font-mono font-bold ${
                      op.completed
                        ? 'bg-victory-900/20 border-victory-500/20 text-victory-500'
                        : 'bg-steel-800 border-steel-700 text-ink-500'
                    }`}>
                      {op.completed ? '✓ DONE' : `+${op.xpReward} XP`}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="px-5 py-2.5 border-t border-steel-800 bg-steel-950/50 flex items-center justify-between">
          <p className="text-[10px] font-mono text-ink-600 uppercase tracking-wider">
            Resets 00:00 AEST
          </p>
          {completedToday === 3 && (
            <p className="text-[10px] font-mono text-victory-500 uppercase tracking-wider font-bold">
              🎖 ALL OPS COMPLETE
            </p>
          )}
        </div>
      )}
    </div>
  )
}
