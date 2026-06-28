import { getTier, getNextTier } from '../services/rankingService'

interface TierProgressProps {
  usr: number
  compact?: boolean
}

const TIER_GLOW: Record<string, string> = {
  'Iron': 'from-[#8B9BB0]/60 to-[#8B9BB0]',
  'Bronze': 'from-rank-bronze/60 to-rank-bronze',
  'Silver': 'from-rank-silver/60 to-rank-silver',
  'Gold': 'from-rank-gold/60 to-rank-gold',
  'Platinum': 'from-pulse-500/60 to-pulse-400',
  'Diamond': 'from-nexus-500/60 to-nexus-400',
  'Nexus Elite': 'from-circuit-500/60 to-circuit-500',
}

const TIER_TEXT: Record<string, string> = {
  'Iron': 'text-[#8B9BB0]',
  'Bronze': 'text-rank-bronze',
  'Silver': 'text-rank-silver',
  'Gold': 'text-rank-gold',
  'Platinum': 'text-pulse-400',
  'Diamond': 'text-nexus-400',
  'Nexus Elite': 'text-circuit-500',
}

export default function TierProgress({ usr, compact = false }: TierProgressProps) {
  const currentTier = getTier(usr)
  const nextTier = getNextTier(usr)

  if (!nextTier) {
    // Max tier
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'w-full'}`}>
        <span className={`text-xs font-mono font-bold uppercase tracking-wider ${TIER_TEXT[currentTier.name] ?? 'text-ink-100'}`}>
          {currentTier.name}
        </span>
        <span className="text-[10px] font-mono text-circuit-500 uppercase">MAX TIER</span>
      </div>
    )
  }

  const rangeSize = nextTier.min - currentTier.min
  const progress = usr - currentTier.min
  const pct = Math.min(100, Math.round((progress / rangeSize) * 100))
  const toNext = nextTier.min - usr

  const gradient = TIER_GLOW[currentTier.name] ?? 'from-nexus-500/60 to-nexus-400'
  const textClass = TIER_TEXT[currentTier.name] ?? 'text-ink-100'
  const nextTextClass = TIER_TEXT[nextTier.name] ?? 'text-ink-300'

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full">
        <span className={`text-[10px] font-mono font-bold uppercase flex-shrink-0 ${textClass}`}>
          {currentTier.name}
        </span>
        <div className="flex-1 h-1.5 bg-steel-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono font-bold uppercase flex-shrink-0 opacity-50 ${nextTextClass}`}>
          {nextTier.name}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
        <span className={`font-bold ${textClass}`}>{currentTier.name}</span>
        <span className="text-ink-500">
          <span className={`font-bold ${nextTextClass}`}>{toNext} USR</span>
          {' '}until {nextTier.name}
        </span>
      </div>
      <div className="h-2 bg-steel-800 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 relative`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-y-0 right-0 w-2 bg-white/20 rounded-full" />
        </div>
      </div>
      <div className="flex justify-between text-[9px] font-mono text-ink-600 uppercase">
        <span>{currentTier.min}</span>
        <span className="text-ink-700">{pct}%</span>
        <span>{nextTier.min}</span>
      </div>
    </div>
  )
}
