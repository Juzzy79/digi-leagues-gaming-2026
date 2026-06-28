import { useState, useMemo, useEffect } from 'react'
import { Users, Crosshair, Trophy, TrendingUp } from 'lucide-react'
import { getMatchHistory } from '../services/matchService'
import { useAuth } from '../context/AuthContext'

export default function CoOpAnalytics() {
  const { profile } = useAuth()
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    if (!profile?.id) return
    getMatchHistory(profile.id).then(({ data }) => setHistory(data || []))
  }, [profile?.id])

  const partyMatches = useMemo(() => {
    return history.filter(h => h.stats && h.stats.teammates && h.stats.teammates.length > 0)
  }, [history])

  const { overallCohesion, teammateStats } = useMemo(() => {
    if (partyMatches.length === 0) return { overallCohesion: 0, teammateStats: [] }

    let totalMatchCohesions = 0
    let teamWins = 0
    const teammates: Record<string, { matches: number, kills: number, deaths: number, assists: number, wins: number }> = {}

    partyMatches.forEach(match => {
      // Calculate this specific match cohesion
      let totalKills = match.stats.kills || 0
      let totalDeaths = match.stats.deaths || 0
      
      const isWin = match.result === 'Win'
      if (isWin) teamWins++

      match.stats.teammates.forEach((tm: any) => {
        const tKills = parseInt(tm.kills) || 0
        const tDeaths = parseInt(tm.deaths) || 0
        const tAssists = parseInt(tm.assists) || 0
        
        totalKills += tKills
        totalDeaths += tDeaths

        if (!teammates[tm.name]) {
          teammates[tm.name] = { matches: 0, kills: 0, deaths: 0, assists: 0, wins: 0 }
        }
        teammates[tm.name].matches++
        teammates[tm.name].kills += tKills
        teammates[tm.name].deaths += tDeaths
        teammates[tm.name].assists += tAssists
        if (isWin) teammates[tm.name].wins++
      })

      const matchKd = totalDeaths === 0 ? totalKills : totalKills / totalDeaths
      const matchCohesion = Math.min(100, Math.max(0, (matchKd * 20) + (isWin ? 40 : 0)))
      totalMatchCohesions += matchCohesion
    })

    const averageCohesion = totalMatchCohesions / partyMatches.length

    const sortedTeammates = Object.entries(teammates).map(([name, stats]) => {
      const kd = stats.deaths === 0 ? stats.kills : stats.kills / stats.deaths
      const winRate = (stats.wins / stats.matches) * 100
      return { name, ...stats, kd, winRate }
    }).sort((a, b) => b.matches - a.matches) // Sort by most matches played together

    return {
      overallCohesion: Math.round(averageCohesion),
      teammateStats: sortedTeammates
    }
  }, [partyMatches])

  if (partyMatches.length === 0) return null

  return (
    <div className="bg-steel-900 border border-steel-800 rounded-lg p-5 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded bg-nexus-900/50 flex items-center justify-center border border-nexus-500/30">
          <Users className="text-nexus-400" size={20} />
        </div>
        <div>
          <h2 className="text-sm font-display font-black text-ink-50 uppercase tracking-widest">Co-Op Analytics</h2>
          <p className="text-[10px] text-ink-400 font-mono uppercase tracking-widest">Squad Performance Grid</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-steel-950 p-4 rounded border border-steel-800 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-display font-black text-nexus-400">{overallCohesion}</span>
          <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest mt-1">Cohesion Index</span>
        </div>
        <div className="bg-steel-950 p-4 rounded border border-steel-800 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-display font-black text-victory-400">{partyMatches.length}</span>
          <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest mt-1">Squad Ops Logged</span>
        </div>
        <div className="bg-steel-950 p-4 rounded border border-steel-800 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-display font-black text-circuit-400">
            {teammateStats.length}
          </span>
          <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest mt-1">Unique Operators</span>
        </div>
      </div>

      <h3 className="text-[10px] font-mono text-ink-500 uppercase tracking-widest mb-3 border-b border-steel-800 pb-2">Teammate Combat Leaderboard</h3>
      
      <div className="space-y-2">
        {teammateStats.map((tm, idx) => (
          <div key={tm.name} className="flex items-center justify-between bg-steel-950 p-3 rounded border border-steel-800">
            <div className="flex items-center gap-3">
              <span className="text-ink-500 font-mono text-xs">{idx + 1}</span>
              <span className="text-sm font-bold text-ink-100 uppercase tracking-wider">{tm.name}</span>
            </div>
            
            <div className="flex gap-6 text-right">
              <div>
                <div className="text-xs font-black text-ink-100">{tm.matches}</div>
                <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest">Ops</div>
              </div>
              <div>
                <div className="text-xs font-black text-nexus-400">{tm.kd.toFixed(2)}</div>
                <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest">Avg K/D</div>
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-black text-victory-400">{tm.winRate.toFixed(0)}%</div>
                <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest">Win Rate</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
