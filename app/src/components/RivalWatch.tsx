import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, TrendingUp, TrendingDown, Minus, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAllProfiles } from '../services/profileService'
import { getNemeses } from '../services/rivalryService'
import { supabase } from '../services/supabase'

interface RivalEntry {
  id: string
  username: string
  avatar_url: string | null
  usr: number
  delta: number        // positive = they're ahead
  rank: number
  isNemesis?: boolean
}

interface RivalWatchProps {
  myRank: number
  totalPlayers: number
}

export default function RivalWatch({ myRank, totalPlayers }: RivalWatchProps) {
  const { user, profile } = useAuth()
  const [rivals, setRivals] = useState<RivalEntry[]>([])
  const [nemeses, setNemeses] = useState<RivalEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !profile) return
    let cancelled = false

    async function load() {
      try {
        // Get all profiles sorted by USR to find adjacent players
        const [profilesRes, nemesisRes] = await Promise.all([
          getAllProfiles(),
          getNemeses(user!.id)
        ])

        if (cancelled) return

        const sorted = (profilesRes.data || []).sort((a, b) => (b.usr ?? 0) - (a.usr ?? 0))
        const myIdx = sorted.findIndex(p => p.id === user!.id)
        const myUsr = profile?.usr ?? 1000

        const adjacent: RivalEntry[] = []

        // Player directly above
        if (myIdx > 0) {
          const above = sorted[myIdx - 1]
          adjacent.push({
            id: above.id,
            username: above.username,
            avatar_url: above.avatar_url,
            usr: above.usr ?? 1000,
            delta: (above.usr ?? 1000) - myUsr,
            rank: myIdx,
            isNemesis: false,
          })
        }

        // Player directly below
        if (myIdx < sorted.length - 1 && myIdx >= 0) {
          const below = sorted[myIdx + 1]
          adjacent.push({
            id: below.id,
            username: below.username,
            avatar_url: below.avatar_url,
            usr: below.usr ?? 1000,
            delta: (below.usr ?? 1000) - myUsr,
            rank: myIdx + 2,
            isNemesis: false,
          })
        }

        setRivals(adjacent)

        // Fetch nemesis profiles
        const nemesisIds = (nemesisRes.data || []).map((n: any) => n.rival_id)
        if (nemesisIds.length > 0) {
          const { data: nemProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, usr')
            .in('id', nemesisIds.slice(0, 2))

          if (!cancelled && nemProfiles) {
            setNemeses(nemProfiles.map((p: any) => ({
              id: p.id,
              username: p.username,
              avatar_url: p.avatar_url,
              usr: p.usr ?? 1000,
              delta: (p.usr ?? 1000) - myUsr,
              rank: sorted.findIndex(s => s.id === p.id) + 1,
              isNemesis: true,
            })))
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.id, profile?.usr])

  const allEntries = [...rivals, ...nemeses.filter(n => !rivals.find(r => r.id === n.id))]

  return (
    <div className="bg-steel-900 border border-steel-700 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-steel-700 bg-gradient-to-r from-steel-950 to-steel-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-duel-900/30 border border-duel-500/30 flex items-center justify-center">
            <Crosshair size={16} className="text-duel-500" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-100">Rival Watch</h3>
            <p className="text-[10px] font-mono text-ink-500 uppercase tracking-wider">
              Your rank: #{myRank} of {totalPlayers}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-steel-800">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded bg-steel-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-steel-800 rounded w-1/2" />
                <div className="h-2 bg-steel-800 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : allEntries.length === 0 ? (
          <div className="px-5 py-8 text-center text-ink-600">
            <Crosshair size={24} className="mx-auto mb-2 opacity-20" />
            <p className="text-xs font-mono uppercase tracking-wider">No rivals identified</p>
            <p className="text-[10px] text-ink-700 mt-1">Log results to rank up and find rivals</p>
          </div>
        ) : (
          allEntries.map(entry => {
            const isAbove = entry.delta > 0
            const isDead = entry.delta === 0

            return (
              <Link
                to={`/app/profile/${entry.id}`}
                key={entry.id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-steel-800/40 transition-colors group"
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded border-2 overflow-hidden flex-shrink-0 transition-colors ${
                  entry.isNemesis
                    ? 'border-threat-500/60 group-hover:border-threat-500'
                    : 'border-steel-600 group-hover:border-nexus-500/50'
                }`}>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} className="w-full h-full object-cover" alt={entry.username} />
                  ) : (
                    <div className="w-full h-full bg-steel-800 flex items-center justify-center">
                      <User size={14} className="text-ink-500" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-mono font-bold text-ink-100 group-hover:text-nexus-400 transition-colors truncate uppercase">
                      {entry.username}
                    </p>
                    {entry.isNemesis && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-threat-900/30 border border-threat-500/30 text-threat-500 rounded tracking-wider flex-shrink-0">
                        NEMESIS
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-ink-500 uppercase">
                    Rank #{entry.rank} · {entry.usr} USR
                  </p>
                </div>

                {/* Delta */}
                <div className={`flex items-center gap-1 text-xs font-mono font-bold flex-shrink-0 ${
                  isAbove ? 'text-threat-500' : isDead ? 'text-ink-500' : 'text-victory-500'
                }`}>
                  {isAbove ? (
                    <TrendingUp size={13} />
                  ) : isDead ? (
                    <Minus size={13} />
                  ) : (
                    <TrendingDown size={13} />
                  )}
                  <span>{isAbove ? '+' : ''}{entry.delta}</span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
