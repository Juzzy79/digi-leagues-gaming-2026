import clsx from 'clsx'
import { getTier } from '../services/rankingService'

interface TierBadgeProps {
  rating: number
  className?: string
  showRating?: boolean
}

export default function TierBadge({ rating, className, showRating = false }: TierBadgeProps) {
  const tier = getTier(rating)

  // We map the preset colors to background opacity classes for the badge container
  const getBgClass = (tierName: string) => {
    switch (tierName) {
      case 'Bronze': return 'bg-rank-bronze/10 border-rank-bronze/30'
      case 'Silver': return 'bg-rank-silver/10 border-rank-silver/30'
      case 'Gold': return 'bg-rank-gold/10 border-rank-gold/30'
      case 'Platinum': return 'bg-pulse-900 border-pulse-500/30'
      case 'Diamond': return 'bg-nexus-900 border-nexus-400/30'
      case 'Nexus Elite': return 'bg-circuit-900 border-circuit-500/30'
      default: return 'bg-steel-800 border-steel-600' // Iron
    }
  }

  return (
    <div className={clsx(
      'inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono font-bold uppercase border',
      getBgClass(tier.name),
      tier.colorClass,
      className
    )}>
      <span>{tier.name}</span>
      {showRating && (
        <>
          <span className="w-px h-3 bg-current opacity-30" />
          <span>{rating}</span>
        </>
      )}
    </div>
  )
}
