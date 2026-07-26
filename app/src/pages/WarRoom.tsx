import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { getMatchHistory } from '../services/matchService'
import { generateWarRoomStats } from '../services/statisticsService'
import type { WarRoomStats } from '../services/statisticsService'
import { 
  Activity, Target, Trophy, Skull, Users, 
  TrendingUp, Crosshair, Crown, Clock, 
  MapPin, Flag, Car, Medal, Hash
} from 'lucide-react'
import Button from '../components/Button'

export default function WarRoom() {
  const { user } = useAuth()
  const [stats, setStats] = useState<WarRoomStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'advanced' | 'coop' | 'racing'>('overview')

  useEffect(() => {
    if (user) {
      getMatchHistory(user.id).then(({ data }) => {
        if (data) {
          setStats(generateWarRoomStats(data))
        }
        setLoading(false)
      })
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 font-mono">
        <div className="text-nexus-500 animate-pulse flex items-center gap-2">
          <Activity className="animate-spin-slow" /> INITIALIZING WAR ROOM_
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 font-mono space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-ink-100 flex items-center gap-4">
            <Target className="text-nexus-500" size={32} /> WAR ROOM
          </h2>
          <div className="h-1 w-32 bg-nexus-500 mt-2 shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
          <p className="text-ink-400 mt-2 text-xs uppercase tracking-widest">Advanced Combat Telemetry & Analytics</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-steel-900 border border-steel-800 rounded p-1">
          {[
            { id: 'overview', icon: Target, label: 'COMMAND' },
            { id: 'advanced', icon: TrendingUp, label: 'ANALYTICS' },
            { id: 'coop', icon: Users, label: 'NEMESIS / CO-OP' },
            { id: 'racing', icon: Flag, label: 'RACING' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${
                activeTab === tab.id 
                  ? 'bg-nexus-900/30 text-nexus-400 border border-nexus-500/50' 
                  : 'text-ink-500 hover:text-ink-300'
              }`}
            >
              <tab.icon size={14} /> {label.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="col-span-1 lg:col-span-4 bg-steel-950 border border-steel-700 p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-nexus-500 uppercase font-bold tracking-widest mb-1">Performance Index</p>
                <h3 className="text-5xl font-black text-ink-50">{stats.global.performanceIndex.toFixed(1)}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-400 uppercase tracking-widest">Based on {stats.global.totalMatches} Operations</p>
              </div>
            </div>

            <div className="bg-steel-900 border border-steel-800 p-6">
              <Crosshair className="text-pulse-500 mb-4" size={24} />
              <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Global K/D Ratio</p>
              <h3 className="text-3xl font-bold text-pulse-400">{stats.global.kdRatio.toFixed(2)}</h3>
              <p className="text-[10px] text-ink-500 mt-2">{stats.global.totalKills} Kills / {stats.global.totalDeaths} Deaths</p>
            </div>

            <div className="bg-steel-900 border border-steel-800 p-6">
              <Trophy className="text-victory-500 mb-4" size={24} />
              <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Global Win Rate</p>
              <h3 className="text-3xl font-bold text-victory-400">{stats.global.winRate.toFixed(1)}%</h3>
            </div>

            <div className="bg-steel-900 border border-steel-800 p-6">
              <Users className="text-nexus-500 mb-4" size={24} />
              <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Cohesion Index</p>
              <h3 className="text-3xl font-bold text-nexus-400">{stats.coop.cohesionIndex.toFixed(1)}</h3>
            </div>

            <div className="bg-steel-900 border border-steel-800 p-6">
              <Activity className="text-threat-500 mb-4" size={24} />
              <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">10-Game WMA K/D</p>
              <h3 className="text-3xl font-bold text-threat-400">{stats.advanced.wma10.toFixed(2)}</h3>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-steel-950 border border-steel-800 p-6">
              <h3 className="text-sm font-display font-black text-ink-100 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Activity size={16} /> Daily Extremes (Today)
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-steel-800 pb-2">
                  <span className="text-xs text-ink-400 uppercase tracking-widest">Ceiling K/D</span>
                  <span className="text-lg font-bold text-pulse-400">{stats.advanced.dailyCeiling.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-steel-800 pb-2">
                  <span className="text-xs text-ink-400 uppercase tracking-widest">Average K/D</span>
                  <span className="text-lg font-bold text-nexus-400">{stats.advanced.dailyAvg.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-xs text-ink-400 uppercase tracking-widest">Floor K/D</span>
                  <span className="text-lg font-bold text-threat-400">{stats.advanced.dailyFloor.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-steel-950 border border-steel-800 p-6">
              <h3 className="text-sm font-display font-black text-ink-100 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Hash size={16} /> K/D Ratio Distribution
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.advanced.kdDistribution).map(([range, count]) => {
                  const max = Math.max(...Object.values(stats.advanced.kdDistribution), 1)
                  const pct = (count / max) * 100
                  return (
                    <div key={range} className="flex items-center gap-4">
                      <span className="text-[10px] text-ink-500 w-16">{range}</span>
                      <div className="flex-1 h-4 bg-steel-900 rounded overflow-hidden">
                        <div className="h-full bg-nexus-600 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-ink-300 w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="col-span-1 lg:col-span-2 bg-steel-950 border border-steel-800 p-6">
              <h3 className="text-sm font-display font-black text-ink-100 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Crown size={16} className="text-yellow-500" /> Mission Hall of Fame
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'PLATINUM (3.0+)', data: stats.advanced.hallOfFame.platinum, color: 'text-cyan-400', border: 'border-cyan-500/30' },
                  { label: 'GOLD (2.0-3.0)', data: stats.advanced.hallOfFame.gold, color: 'text-yellow-400', border: 'border-yellow-500/30' },
                  { label: 'SILVER (1.5-2.0)', data: stats.advanced.hallOfFame.silver, color: 'text-zinc-400', border: 'border-zinc-500/30' },
                  { label: 'BRONZE (< 1.5)', data: stats.advanced.hallOfFame.bronze, color: 'text-amber-600', border: 'border-amber-700/30' }
                ].map(tier => (
                  <div key={tier.label} className={`p-4 border ${tier.border} bg-steel-900/50 rounded text-center`}>
                    <p className={`text-[10px] font-bold ${tier.color} mb-2`}>{tier.label}</p>
                    <p className="text-3xl font-black text-ink-100">{tier.data.length}</p>
                    <p className="text-[10px] text-ink-500 uppercase mt-1">Matches</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'coop' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Nemesis */}
            <div className="bg-steel-950 border border-threat-500/50 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-threat-500 to-transparent" />
              <h3 className="text-sm font-display font-black text-threat-500 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Skull size={16} /> Nemesis Status
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-steel-900 p-4 border border-steel-800">
                  <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Active Streak</p>
                  <p className="text-2xl font-bold text-threat-400">{stats.nemesis.activeStreak}</p>
                </div>
                <div className="bg-steel-900 p-4 border border-steel-800">
                  <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Max Streak</p>
                  <p className="text-2xl font-bold text-threat-400">{stats.nemesis.maxStreak}</p>
                </div>
              </div>

              {stats.nemesis.ultimateRival ? (
                <div className="bg-steel-900 border border-threat-500/30 p-6 text-center rounded">
                  <p className="text-[10px] text-threat-500 uppercase font-bold tracking-widest mb-2">Ultimate Rival</p>
                  <h4 className="text-3xl font-black text-ink-50 uppercase mb-4">{stats.nemesis.ultimateRival}</h4>
                  
                  <div className="flex justify-center items-center gap-6">
                    <div>
                      <p className="text-[10px] text-ink-500 uppercase">You Killed</p>
                      <p className="text-xl font-bold text-victory-400">{stats.nemesis.rivalKills}</p>
                    </div>
                    <div className="text-threat-500 font-bold">VS</div>
                    <div>
                      <p className="text-[10px] text-ink-500 uppercase">Killed You</p>
                      <p className="text-xl font-bold text-threat-400">{stats.nemesis.rivalDeaths}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-steel-800">
                    <span className={`px-4 py-1 text-xs font-bold uppercase rounded ${
                      stats.nemesis.rivalStatus === 'WINNER' ? 'bg-victory-500 text-steel-950' : 
                      stats.nemesis.rivalStatus === 'LOSER' ? 'bg-threat-500 text-white' : 
                      'bg-steel-700 text-ink-200'
                    }`}>
                      {stats.nemesis.rivalStatus === 'WINNER' ? 'WINNING RIVALRY' : 
                       stats.nemesis.rivalStatus === 'LOSER' ? 'LOSING RIVALRY' : 'TIED RIVALRY'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-ink-500 text-xs text-center py-8 border border-dashed border-steel-800">NO NEMESIS DATA RECORDED</p>
              )}
            </div>

            {/* Teammates */}
            <div className="bg-steel-950 border border-steel-800 p-6">
              <h3 className="text-sm font-display font-black text-nexus-500 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Users size={16} /> Teammate Leaderboard
              </h3>
              
              {stats.coop.teammates.length > 0 ? (
                <div className="space-y-3">
                  {stats.coop.teammates.map((t, i) => (
                    <div key={t.name} className="flex items-center bg-steel-900 border border-steel-800 p-3 rounded">
                      <div className="w-8 text-steel-600 font-bold text-sm">#{i + 1}</div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-ink-100 uppercase">{t.name}</p>
                        <p className="text-[9px] text-ink-500 uppercase">{t.matches} Matches · {t.winRate.toFixed(0)}% WR</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-nexus-400">{t.kdRatio.toFixed(2)}</p>
                        <p className="text-[9px] text-ink-500 uppercase">K/D RATIO</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-500 text-xs text-center py-8 border border-dashed border-steel-800">NO CO-OP DATA RECORDED</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'racing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-steel-950 border border-steel-800 p-6 flex items-center gap-4">
                <MapPin size={32} className="text-nexus-500" />
                <div>
                  <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Unique Tracks Raced</p>
                  <p className="text-3xl font-bold text-ink-100">{stats.racing.uniqueTracks}</p>
                </div>
              </div>
              <div className="bg-steel-950 border border-steel-800 p-6 flex items-center gap-4">
                <Clock size={32} className="text-pulse-500" />
                <div>
                  <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Single Laps Logged</p>
                  <p className="text-3xl font-bold text-ink-100">{stats.racing.lapsCount}</p>
                </div>
              </div>
              <div className="bg-steel-950 border border-steel-800 p-6 flex items-center gap-4">
                <Flag size={32} className="text-victory-500" />
                <div>
                  <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Full Races Logged</p>
                  <p className="text-3xl font-bold text-ink-100">{stats.racing.racesCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-steel-950 border border-steel-800 p-6">
              <h3 className="text-sm font-display font-black text-ink-100 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Medal size={16} className="text-nexus-500" /> Personal Records (PBs)
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-steel-800 text-[10px] uppercase tracking-widest text-ink-500">
                      <th className="py-3 px-4 font-bold">Track Name</th>
                      <th className="py-3 px-4 font-bold text-right">Best Lap</th>
                      <th className="py-3 px-4 font-bold text-right">Best Lap Car</th>
                      <th className="py-3 px-4 font-bold text-right">Total Race Time</th>
                      <th className="py-3 px-4 font-bold text-right">Race Car</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.racing.personalBests).map(([track, pb]) => (
                      <tr key={track} className="border-b border-steel-800/50 hover:bg-steel-900/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-xs text-ink-100 uppercase">{track}</td>
                        <td className="py-3 px-4 text-xs text-right text-pulse-400 font-bold">
                          {pb.bestLap ? `${Math.floor(pb.bestLap / 60)}:${(pb.bestLap % 60).toFixed(3).padStart(6, '0')}` : '--'}
                        </td>
                        <td className="py-3 px-4 text-[10px] text-right text-ink-400 uppercase">
                          {pb.bestLapCar || '--'}
                        </td>
                        <td className="py-3 px-4 text-xs text-right text-victory-400 font-bold">
                          {pb.totalTime ? `${Math.floor(pb.totalTime / 60)}:${(pb.totalTime % 60).toFixed(3).padStart(6, '0')}` : '--'}
                        </td>
                        <td className="py-3 px-4 text-[10px] text-right text-ink-400 uppercase">
                          {pb.totalTimeCar || '--'}
                        </td>
                      </tr>
                    ))}
                    {Object.keys(stats.racing.personalBests).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-ink-500 border-dashed border-t border-b border-steel-800">
                          NO RACING RECORDS FOUND
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
