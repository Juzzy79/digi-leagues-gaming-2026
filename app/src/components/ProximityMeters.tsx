import { useEffect, useState } from 'react'
import { Target, Timer, Shield, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAllProfiles } from '../services/profileService'
import { getTier, getNextTier } from '../services/rankingService'
import { supabase } from '../services/supabase'
import { getWeeklyChallengeInfo, formatTime } from '../pages/Leaderboard'

interface Meter {
  icon: React.ReactNode
  label: string
  detail: string
  colour: string
  pct: number         // 0-100, for the bar fill
}

function buildMeters(
  myUsr: number,
  profiles: any[],
  rivals: any[],
  weeklyBestTime: number | null,
  myBestTime: number | null,
): Meter[] {
  const meters: Meter[] = []

  // 1 — Tier progress
  const nextTier = getNextTier(myUsr)
  if (nextTier) {
    const currentTier = getTier(myUsr)
    const rangeSize = nextTier.min - currentTier.min
    const progress = myUsr - currentTier.min
    const toNext = nextTier.min - myUsr
    meters.push({
      icon: <TrendingUp size={14} />,
      label: `${toNext} USR from ${nextTier.name}`,
      detail: `Currently ${currentTier.name} · ${myUsr} USR`,
      colour: 'text-rank-gold',
      pct: Math.round((progress / rangeSize) * 100),
    })
  }

  // 2 — Dog tag: closest rival where user is 1 win away
  const almostTag = rivals.find((r: any) => r.net_score !== undefined && r.net_score === 2)
  if (almostTag) {
    meters.push({
      icon: <Shield size={14} />,
      label: `1 win from claiming ${almostTag.rival_username || 'a rival'}'s dog tag`,
      detail: 'Win one more match against them',
      colour: 'text-duel-500',
      pct: 67,
    })
  }

  // 3 — Weekly track (racing) podium gap
  if (weeklyBestTime && myBestTime) {
    const gapSeconds = myBestTime - weeklyBestTime
    if (gapSeconds > 0 && gapSeconds < 60) {
      meters.push({
        icon: <Timer size={14} />,
        label: `${gapSeconds.toFixed(1)}s off the weekly track podium`,
        detail: `Track: ${getWeeklyChallengeInfo().target} · Your best: ${formatTime(myBestTime)}`,
        colour: 'text-pulse-400',
        pct: Math.round(Math.max(0, 100 - (gapSeconds / 60) * 100)),
      })
    }
  }

  // Fallback — "close to next win milestone"
  if (meters.length < 2) {
    const sortedByUsr = [...profiles].sort((a, b) => (b.usr ?? 0) - (a.usr ?? 0))
    const myIdx = sortedByUsr.findIndex(p => p.usr <= myUsr)
    if (myIdx > 0) {
      const above = sortedByUsr[myIdx - 1]
      const gap = (above.usr ?? 1000) - myUsr
      if (gap > 0 && gap < 200) {
        meters.push({
          icon: <Target size={14} />,
          label: `${gap} USR behind ${above.username}`,
          detail: `Win consistently to close the gap`,
          colour: 'text-nexus-400',
          pct: Math.round(Math.max(0, 100 - (gap / 200) * 100)),
        })
      }
    }
  }

  return meters.slice(0, 3)
}

export default function ProximityMeters() {
  const { user, profile } = useAuth()
  const [meters, setMeters] = useState<Meter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !profile) return
    let cancelled = false

    async function load() {
      try {
        const currentTrack = getWeeklyChallengeInfo().target

        const [profilesRes, rivalsRes, weeklyRes, myLapsRes] = await Promise.all([
          getAllProfiles(),
          supabase
            .from('rivalries')
            .select('rival_id, net_score, profiles!rival_id(username)')
            .eq('player_id', user!.id)
            .gt('net_score', 0),
          // Top lap time on weekly track
          supabase
            .from('match_history')
            .select('stats')
            .or(`game.ilike.%${currentTrack}%,game.eq.Weekly Track: ${currentTrack}`)
            .eq('genre', 'Racing')
            .order('stats->total_time', { ascending: true })
            .limit(1),
          // My best on weekly track
          supabase
            .from('match_history')
            .select('stats')
            .eq('user_id', user!.id)
            .or(`game.ilike.%${currentTrack}%,game.eq.Weekly Track: ${currentTrack}`)
            .eq('genre', 'Racing')
            .order('stats->total_time', { ascending: true })
            .limit(1),
        ])

        if (cancelled) return

        const rivals = (rivalsRes.data || []).map((r: any) => ({
          ...r,
          rival_username: r.profiles?.username,
        }))

        const weeklyBest = weeklyRes.data?.[0]?.stats?.total_time
          ? parseFloat(weeklyRes.data[0].stats.total_time)
          : null
        const myBest = myLapsRes.data?.[0]?.stats?.total_time
          ? parseFloat(myLapsRes.data[0].stats.total_time)
          : null

        const built = buildMeters(
          profile!.usr ?? 1000,
          profilesRes.data || [],
          rivals,
          weeklyBest,
          myBest,
        )

        setMeters(built)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.id, profile?.usr])

  return (
    <div className="bg-steel-900 border border-steel-700 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-steel-700 bg-gradient-to-r from-steel-950 to-steel-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-pulse-900/30 border border-pulse-500/30 flex items-center justify-center">
            <Target size={16} className="text-pulse-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-100">Almost There</h3>
            <p className="text-[10px] font-mono text-ink-500 uppercase tracking-wider">Your closest breakthroughs</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-steel-800">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="px-5 py-4 animate-pulse space-y-2">
              <div className="h-3 bg-steel-800 rounded w-3/4" />
              <div className="h-1.5 bg-steel-800 rounded-full w-full" />
            </div>
          ))
        ) : meters.length === 0 ? (
          <div className="px-5 py-8 text-center text-ink-600">
            <p className="text-xs font-mono uppercase tracking-wider">Log more results to unlock proximity data</p>
          </div>
        ) : (
          meters.map((m, i) => (
            <div key={i} className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={m.colour}>{m.icon}</span>
                <p className={`text-xs font-mono font-bold ${m.colour}`}>{m.label}</p>
              </div>
              <div className="h-1.5 bg-steel-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-steel-600 to-current transition-all duration-700"
                  style={{ width: `${m.pct}%`, color: 'inherit' }}
                />
              </div>
              <p className="text-[10px] font-mono text-ink-600 uppercase tracking-wider">{m.detail}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
