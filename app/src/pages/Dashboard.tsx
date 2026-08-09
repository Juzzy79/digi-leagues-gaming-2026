import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import ActivityFeed from '../components/ActivityFeed'
import DailyOpsPanel from '../components/DailyOpsPanel'
import RivalWatch from '../components/RivalWatch'
import TierProgress from '../components/TierProgress'
import StreakWidget from '../components/StreakWidget'
import ProximityMeters from '../components/ProximityMeters'
import PerformanceDebrief from '../components/PerformanceDebrief'
import GoalTracker from '../components/GoalTracker'
import AnimatedNumber from '../components/AnimatedNumber'
import CoOpPartyPanel from '../components/CoOpPartyPanel'
import CoOpAnalytics from '../components/CoOpAnalytics'
import {
  Crosshair, ShieldAlert, Check, X, Timer, Swords, Zap,
  ChevronRight, Star, Target
} from 'lucide-react'
import Button from '../components/Button'
import { getPendingChallenges, updateChallengeStatus } from '../services/challengeService'
import type { Challenge } from '../services/challengeService'
import { supabase } from '../services/supabase'
import { getStreakData } from '../services/streakService'
import type { StreakData } from '../services/streakService'
import { getAllProfiles } from '../services/profileService'

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Now'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activeChallenge, setActiveChallenge] = useState<any>(null)
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [myRank, setMyRank] = useState(0)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [nextTournament, setNextTournament] = useState<any>(null)
  const [weeklyPodium, setWeeklyPodium] = useState<any[]>([])

  // ── Load streak + rank ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false

    Promise.all([
      getStreakData(profile.id),
      getAllProfiles(),
    ]).then(([streakData, profilesRes]) => {
      if (cancelled) return
      setStreak(streakData)
      const sorted = (profilesRes.data || []).sort((a, b) => (b.usr ?? 0) - (a.usr ?? 0))
      setTotalPlayers(sorted.length)
      const idx = sorted.findIndex(p => p.id === profile.id)
      setMyRank(idx >= 0 ? idx + 1 : 0)
    })

    return () => { cancelled = true }
  }, [profile?.id])

  // ── Load active weekly challenge + next tournament ──────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchMeta() {
      const [challengeRes, tourRes] = await Promise.all([
        supabase.from('system_settings').select('*').eq('key', 'active_weekly_challenge').single(),
        supabase
          .from('tournaments')
          .select('id, name, start_time, status, game')
          .in('status', ['upcoming', 'registration'])
          .order('start_time', { ascending: true })
          .limit(1)
          .single(),
      ])

      if (cancelled) return

      if (challengeRes.data?.value) {
        setActiveChallenge(challengeRes.data.value)

        // Fetch top 3 for the challenge podium
        const challenge = challengeRes.data.value
        const { data: podiumData } = await supabase
          .from('match_history')
          .select('user_id, stats, profiles(username, avatar_url)')
          .or(`game.ilike.%${challenge.game}%`)
          .eq('genre', challenge.genre || 'Racing')
          .order('created_at', { ascending: false })
          .limit(50)

        if (!cancelled && podiumData) {
          // Aggregate best per user
          const bestByUser: Record<string, any> = {}
          podiumData.forEach((row: any) => {
            const uid = row.user_id
            const time = parseFloat(row.stats?.total_time || '999999')
            if (!bestByUser[uid] || time < bestByUser[uid].best) {
              bestByUser[uid] = {
                username: row.profiles?.username,
                avatar_url: row.profiles?.avatar_url,
                best: time,
              }
            }
          })
          const sorted = Object.values(bestByUser).sort((a: any, b: any) => a.best - b.best).slice(0, 3)
          setWeeklyPodium(sorted)
        }
      }

      if (tourRes.data) setNextTournament(tourRes.data)
    }

    fetchMeta()
    return () => { cancelled = true }
  }, [])

  // ── Poll challenges every 15s ───────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
    let cancelled = false

    const fetchChallenges = async () => {
      const { data } = await getPendingChallenges(profile.id)
      if (!cancelled && data) setChallenges(data)
    }

    fetchChallenges()
    const interval = setInterval(fetchChallenges, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [profile])

  async function handleChallengeResponse(id: string, accept: boolean) {
    const status = accept ? 'accepted' : 'declined'
    const { success } = await updateChallengeStatus(id, status)
    if (success) setChallenges(prev => prev.filter(c => c.id !== id))
  }

  const usr = profile?.usr ?? 1000
  const careerXp = (profile as any)?.career_xp ?? 0

  return (
    <div className="flex-1 w-full overflow-auto">

      {/* ── TOP STRIP: Streak + Tier + XP + rank ───────────────────────────── */}
      <div className="sticky top-0 z-10 bg-steel-950/95 backdrop-blur border-b border-steel-800 px-4 lg:px-8 py-3 flex flex-wrap items-center gap-4">

        {/* Rank badge */}
        {myRank > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-500 bg-steel-900 border border-steel-700 px-3 py-1.5 rounded uppercase tracking-wider">
            <Star size={11} className="text-rank-gold" />
            Rank <span className="text-ink-200 font-bold">#{myRank}</span>
            <span className="text-ink-700 mx-1">·</span>
            <span>{totalPlayers} operators</span>
          </div>
        )}

        {/* Streaks */}
        {streak && (
          <StreakWidget
            playStreak={streak.playStreak}
            winStreak={streak.winStreak}
          />
        )}

        {/* Tier progress — compact */}
        <div className="flex-1 min-w-[160px] max-w-xs hidden sm:block">
          <TierProgress usr={usr} compact />
        </div>

        {/* Career XP */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-circuit-500 bg-circuit-900/20 border border-circuit-500/20 px-3 py-1.5 rounded uppercase tracking-wider ml-auto">
          <Zap size={11} />
          <AnimatedNumber value={careerXp} className="font-bold" /> Career XP
        </div>

        {/* CTA */}
        <Link to="/app/submit">
          <Button variant="primary" className="!py-1.5 !px-4 !text-xs">
            + Log Result
          </Button>
        </Link>
      </div>

      {/* ── BRIEFING BODY ──────────────────────────────────────────────────── */}
      <div className="p-4 lg:p-8 space-y-6">

        {/* Commander header — sparse, military */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-[0.12em] text-ink-100">
              COMMAND CENTRE
            </h1>
            <p className="text-[10px] font-mono text-ink-500 uppercase tracking-widest mt-0.5">
              {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })} · {profile?.username || 'OPERATOR'}
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-ink-700 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-victory-500 animate-pulse" />
            Systems online
          </div>
        </div>

        {/* ── Weekly Challenge Banner ──────────────────────────────────────── */}
        {activeChallenge && (
          <div className="bg-pulse-950/40 border border-pulse-500/30 rounded-lg p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,255,231,0.05)]">
            <div className="absolute top-0 right-0 w-64 h-full bg-pulse-500/5 blur-3xl transform translate-x-1/2 pointer-events-none" />

            <div className="space-y-1 relative z-10 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-pulse-500 text-steel-950 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1.5">
                  <Timer size={10} className="animate-spin-slow" /> Active Weekly Challenge
                </span>
                <span className="text-ink-500 text-[10px] font-mono uppercase tracking-widest">
                  Genre: {activeChallenge.genre}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-display font-black text-ink-100 uppercase tracking-wide">
                {activeChallenge.game}{activeChallenge.target ? ` · ${activeChallenge.target}` : ''}
              </h2>
              {activeChallenge.description && (
                <p className="text-ink-400 text-xs font-body max-w-xl">{activeChallenge.description}</p>
              )}

              {/* Mini podium */}
              {weeklyPodium.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] font-mono text-ink-600 uppercase">Podium:</span>
                  {weeklyPodium.map((p: any, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-steel-900/60 border border-steel-700 px-2 py-1 rounded text-[10px] font-mono">
                      <span className="text-ink-600">#{i + 1}</span>
                      <span className="text-ink-200 font-bold">{p.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link to="/app/submit" className="relative z-10 shrink-0">
              <Button variant="primary" className="!bg-pulse-500 !text-steel-950 hover:!bg-pulse-400 !border-none font-bold shadow-[0_0_15px_rgba(0,255,231,0.2)] whitespace-nowrap">
                Submit Entry
              </Button>
            </Link>
          </div>
        )}

        {/* ── MAIN GRID ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT — 3 cols */}
          <div className="lg:col-span-3 space-y-6">

            {/* Daily Ops */}
            <DailyOpsPanel />

            {/* Performance Debrief & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GoalTracker />
              <PerformanceDebrief />
            </div>

            {/* Almost There */}
            <ProximityMeters />

            {/* Co-Op Analytics */}
            <CoOpAnalytics />

            {/* Activity Feed */}
            <ActivityFeed className="h-[480px]" />
          </div>

          {/* RIGHT — 2 cols */}
          <div className="lg:col-span-2 space-y-6">

            {/* Co-Op Party Panel */}
            <CoOpPartyPanel />

            {/* Rival Watch */}
            <RivalWatch myRank={myRank} totalPlayers={totalPlayers} />

            {/* Countdown cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Next tournament */}
              <div className="bg-steel-900 border border-steel-700 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-500 uppercase tracking-widest">
                  <Swords size={12} className="text-nexus-400" /> Tournament
                </div>
                {nextTournament ? (
                  <>
                    <p className="text-xs font-mono font-bold text-ink-100 leading-tight truncate">{nextTournament.name}</p>
                    <p className="text-lg font-display font-black text-nexus-400">
                      {timeUntil(nextTournament.start_time)}
                    </p>
                    <Link to={`/app/tournaments?select=${nextTournament.id}`} className="text-[10px] font-mono text-nexus-400/60 hover:text-nexus-400 transition-colors uppercase tracking-wider flex items-center gap-1">
                      View bracket <ChevronRight size={10} />
                    </Link>
                  </>
                ) : (
                  <p className="text-xs font-mono text-ink-600 italic">No upcoming tournaments</p>
                )}
              </div>

              {/* Weekly reset */}
              <div className="bg-steel-900 border border-steel-700 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-500 uppercase tracking-widest">
                  <Timer size={12} className="text-pulse-400" /> Weekly Reset
                </div>
                <p className="text-xs font-mono font-bold text-ink-100 leading-tight">Weekly Challenge</p>
                <p className="text-lg font-display font-black text-pulse-400">
                  {(() => {
                    const now = new Date()
                    const nextMon = new Date(now)
                    const daysUntilMon = (8 - now.getUTCDay()) % 7 || 7
                    nextMon.setUTCDate(now.getUTCDate() + daysUntilMon)
                    nextMon.setUTCHours(0, 0, 0, 0)
                    return timeUntil(nextMon.toISOString())
                  })()}
                </p>
                <Link to="/app/leaderboard" className="text-[10px] font-mono text-pulse-400/60 hover:text-pulse-400 transition-colors uppercase tracking-wider flex items-center gap-1">
                  View podium <ChevronRight size={10} />
                </Link>
              </div>
            </div>

            {/* Pending Challenges */}
            <div className="bg-steel-900 border border-steel-700 rounded-lg p-5">
              <h3 className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Crosshair size={14} className="text-duel-500" />
                Combat Requests
                {challenges.length > 0 && (
                  <span className="bg-duel-500 text-steel-950 font-bold px-1.5 rounded text-[10px] ml-auto">
                    {challenges.length}
                  </span>
                )}
              </h3>

              {challenges.length === 0 ? (
                <div className="bg-duel-900/10 border border-duel-500/20 rounded p-5 text-center text-ink-500 flex flex-col items-center">
                  <ShieldAlert size={22} className="text-duel-500/40 mb-2" />
                  <p className="font-body text-xs">No pending combat requests.</p>
                  <Link to="/app/community" className="text-[10px] font-mono text-duel-500/50 hover:text-duel-500 mt-1 transition-colors uppercase tracking-wider">
                    Find operators →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {challenges.map(challenge => (
                    <div key={challenge.id} className="bg-steel-800 border-l-2 border-duel-500 rounded p-3 text-sm">
                      <p className="text-ink-100 font-bold text-xs font-mono">{challenge.challenger_name}</p>
                      <p className="font-mono text-nexus-400 text-[10px] mt-0.5">{challenge.game}</p>
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-steel-700">
                        <Button
                          variant="ghost"
                          className="flex-1 py-1 px-2 text-[10px]"
                          onClick={() => handleChallengeResponse(challenge.id, false)}
                        >
                          <X size={12} className="mr-1" /> Decline
                        </Button>
                        <Button
                          variant="danger"
                          className="flex-1 py-1 px-2 text-[10px] !bg-duel-500/20 !text-duel-400 hover:!bg-duel-500 hover:!text-steel-950 !border-duel-500/40"
                          onClick={() => handleChallengeResponse(challenge.id, true)}
                        >
                          <Check size={12} className="mr-1" /> Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/app/submit" className="w-full">
                <Button variant="primary" className="w-full py-5 text-sm">
                  <Target size={15} className="mr-1.5" /> Log Result
                </Button>
              </Link>
              <Link to="/app/community" className="w-full">
                <Button variant="secondary" className="w-full py-5 text-sm">
                  Find Rivals
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
