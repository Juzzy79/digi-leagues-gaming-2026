import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllProfiles } from '../services/profileService'
import { getLeaderboardStats, getUniqueGamesPerGenre } from '../services/matchService'
import TierBadge from '../components/TierBadge'
import StreakWidget from '../components/StreakWidget'
import { Trophy, Medal, Crown, Target, Activity, Timer, Cpu, Gamepad2, ChevronDown, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { GENRES } from '../services/rankingService'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import { getFriendLeaderboard } from '../services/friendService'
import type { FriendLeaderboardEntry } from '../services/friendService'
import { getUserCrew, getCrewMembers } from '../services/crewService'
import type { CrewMember, Crew } from '../services/crewService'

const WEEKLY_ROTATION = [
  { genre: 'Racing', type: 'Weekly Track', game: 'Forza Motorsport', target: 'Spa-Francorchamps', unit: 'Time', isAscending: true },
  { genre: 'Shooter', type: 'Weekly Gauntlet', game: 'Call of Duty', target: '2.5 K/D Ratio', unit: 'K/D', isAscending: false },
  { genre: 'Puzzle', type: 'Score Attack', game: 'Tetris Effect', target: '100,000 Points', unit: 'Score', isAscending: false },
  { genre: 'Fighter', type: 'Bounty', game: 'Street Fighter 6', target: 'Defeat Highest Ranked', unit: 'Wins', isAscending: false }
]

export function getWeeklyChallengeInfo() {
  const d = new Date();
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return WEEKLY_ROTATION[weekNo % WEEKLY_ROTATION.length];
}

export function formatTime(totalSeconds: number) {
  if (!totalSeconds) return '--:--.---';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export default function Leaderboard() {
  const { user, profile } = useAuth()
  const [profiles, setProfiles] = useState<any[]>([])
  const [friendBoard, setFriendBoard] = useState<FriendLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGenre, setActiveGenre] = useState<string>('Overall')
  const [activeGame, setActiveGame] = useState<string>('All')
  const [availableGames, setAvailableGames] = useState<string[]>([])
  const [showGameSelect, setShowGameSelect] = useState(false)
  const [activeChallenge, setActiveChallenge] = useState<any>(null)
  
  const [myCrew, setMyCrew] = useState<Crew | null>(null)
  const [crewBoard, setCrewBoard] = useState<CrewMember[]>([])

  const currentChallenge = getWeeklyChallengeInfo();

  useEffect(() => {
    supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'active_weekly_challenge')
      .single()
      .then(({ data }) => {
        if (data && data.value) {
          setActiveChallenge(data.value)
        }
      })

    if (user) {
      getUserCrew(user.id).then(({ data }) => {
        if (data) {
          setMyCrew(data)
          setActiveGenre('My Crew')
        }
      })
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    // Load available games if genre is active
    if (activeGenre !== 'Overall' && activeGenre !== 'Weekly Challenge' && activeGenre !== 'Friends' && activeGenre !== 'My Crew') {
      getUniqueGamesPerGenre(activeGenre).then(games => {
        if (!cancelled) setAvailableGames(games)
      })
    }

    // Fetch stats
    if (activeGenre === 'Overall') {
      getAllProfiles().then(({ data }) => {
        if (!cancelled) {
          const sorted = (data || []).sort((a, b) => (b.usr || 0) - (a.usr || 0))
          setProfiles(sorted)
          setLoading(false)
        }
      })
    } else if (activeGenre === 'Weekly Challenge') {
      let query = supabase
        .from('match_history')
        .select('*, profiles(id, username, avatar_url)');
      
      if (activeChallenge) {
        // Match either the full name "Weekly Challenge: Game (Target)" or just the game title in matches
        query = query.or(`game.ilike.%${activeChallenge.game}%,game.eq.Weekly Challenge: ${activeChallenge.game}`);
      } else {
        query = query.or(`game.eq.${currentChallenge.type}: ${currentChallenge.target},game.eq.${currentChallenge.type}: ${currentChallenge.game}`).eq('genre', currentChallenge.genre);
      }

      query.then(({ data, error }) => {
          if (cancelled) return;
          if (error) {
            console.error(error);
            setProfiles([]);
          } else {
            const userBests: Record<string, any> = {};
            const genre = activeChallenge?.genre || currentChallenge.genre;

            (data || []).forEach((item: any) => {
              const u = item.profiles;
              if (!u) return;

              let metricVal = 0;
              let isBetter = false;

              if (genre === 'Racing') {
                metricVal = item.stats?.total_time !== undefined ? parseFloat(item.stats.total_time) : 999999;
                const existing = userBests[u.id]?.best_value ?? 999999;
                isBetter = metricVal < existing;
              } else if (genre === 'Battle Royale') {
                metricVal = item.stats?.position !== undefined ? parseInt(item.stats.position) : 999;
                const existing = userBests[u.id]?.best_value ?? 999;
                isBetter = metricVal < existing;
              } else if (genre === 'Puzzle') {
                metricVal = item.stats?.score !== undefined ? parseInt(item.stats.score) : 0;
                const existing = userBests[u.id]?.best_value ?? -1;
                isBetter = metricVal > existing;
              } else if (genre === 'Shooter') {
                metricVal = item.stats?.kills !== undefined ? parseInt(item.stats.kills) : 0;
                const existing = userBests[u.id]?.best_value ?? -1;
                isBetter = metricVal > existing;
              } else if (genre === 'Fighter') {
                metricVal = item.stats?.wins_in_set !== undefined ? parseInt(item.stats.wins_in_set) : 0;
                const existing = userBests[u.id]?.best_value ?? -1;
                isBetter = metricVal > existing;
              } else {
                metricVal = item.result === 'Win' ? 1 : 0;
                const existing = userBests[u.id]?.best_value ?? -1;
                isBetter = metricVal > existing;
              }

              if (!userBests[u.id] || isBetter) {
                userBests[u.id] = {
                  id: u.id,
                  username: u.username,
                  avatar_url: u.avatar_url,
                  best_value: metricVal,
                  genre: genre,
                  created_at: item.created_at
                };
              }
            });

            const sorted = Object.values(userBests).sort((a: any, b: any) => {
              if (currentChallenge.isAscending) {
                return a.best_value - b.best_value;
              }
              return b.best_value - a.best_value;
            });
            setProfiles(sorted);
          }
          setLoading(false);
        });
    } else {
      getLeaderboardStats(activeGenre, activeGame).then(data => {
        if (!cancelled) {
          // Sort logic based on genre/game
          const sorted = (data || []).sort((a, b) => {
            if (activeGenre === 'Puzzle') return b.high_score - a.high_score
            if (activeGenre === 'Shooter' && activeGame === 'All') return b.kd_ratio - a.kd_ratio
            // Default to rating in that genre
            const ratingA = a.genre_ratings?.[activeGenre]?.rating || 1000
            const ratingB = b.genre_ratings?.[activeGenre]?.rating || 1000
            return ratingB - ratingA
          })
          setProfiles(sorted)
          setLoading(false)
        }
      })
    }
    
    return () => { cancelled = true }
  }, [activeGenre, activeGame])

  // Load Friends leaderboard when that tab is active
  useEffect(() => {
    if (activeGenre !== 'Friends' || !user?.id) return
    let cancelled = false
    setLoading(true)
    getFriendLeaderboard(user.id, profile?.usr ?? 1000).then(data => {
      if (!cancelled) {
        setFriendBoard(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [activeGenre, user?.id, profile?.usr])

  // Load Crew leaderboard
  useEffect(() => {
    if (activeGenre !== 'My Crew' || !myCrew) return
    let cancelled = false
    setLoading(true)
    getCrewMembers(myCrew.id).then(({ data }) => {
      if (!cancelled) {
        setCrewBoard(data || [])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [activeGenre, myCrew])

  const top3 = profiles.slice(0, 3)
  const rest = profiles.slice(3)

  const genreIcons: Record<string, any> = {
    'Shooter': <Target size={14} />,
    'Battle Royale': <Activity size={14} />,
    'Racing': <Timer size={14} />,
    'Puzzle': <Cpu size={14} />,
    'Fighter': <Gamepad2 size={14} />
  }

  const getMetricSummary = (p: any) => {
    if (activeGenre === 'Weekly Challenge') {
      const genre = p.genre || 'Racing';
      let label = 'PB Time';
      if (genre === 'Puzzle') label = 'PB Score';
      if (genre === 'Shooter') label = 'PB Kills';
      if (genre === 'Battle Royale') label = 'PB Pos';
      if (genre === 'Fighter') label = 'PB Wins';
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="text-nexus-300 font-bold uppercase text-[10px]">{label} Committed</span>
          <span className="text-ink-500 text-[10px]">{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</span>
        </div>
      )
    }

    if (activeGenre === 'Overall') {
      return (
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <span className="text-victory-500">{p.wins}W</span>
            <span className="text-threat-500">{p.losses}L</span>
          </div>
          <span className="text-ink-500">{p.win_rate}% EFFECT_RT</span>
        </div>
      )
    }

    if (activeGenre === 'Shooter') {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="text-nexus-400 font-bold">{p.kd_ratio} K/D</span>
          <span className="text-ink-500">{p.win_rate}% WIN</span>
        </div>
      )
    }

    if (activeGenre === 'Puzzle') {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="text-victory-500 font-bold">{p.high_score.toLocaleString()} MAX</span>
          <span className="text-ink-500">AVG: {p.avg_score.toLocaleString()}</span>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-victory-500">{p.wins} WINS</span>
        <span className="text-ink-500">{p.win_rate}% WIN</span>
      </div>
    )
  }

  const getRatingValue = (p: any) => {
    if (activeGenre === 'Weekly Challenge') {
      const genre = p.genre || 'Racing';
      if (genre === 'Racing') return formatTime(p.best_value);
      if (genre === 'Battle Royale') return `Pos: #${p.best_value}`;
      if (genre === 'Puzzle') return `${p.best_value.toLocaleString()} pts`;
      if (genre === 'Shooter') return `${p.best_value} kills`;
      if (genre === 'Fighter') return `${p.best_value} wins`;
      return p.best_value === 1 ? 'Win' : 'Loss';
    }
    if (activeGenre === 'Overall') return p.usr
    if (activeGenre === 'Puzzle') return p.high_score.toLocaleString()
    if (activeGenre === 'Shooter' && activeGame === 'All') return p.kd_ratio
    return p.genre_ratings?.[activeGenre]?.rating || 1000
  }

  return (
    <div className="flex-1 w-full p-4 lg:p-8 space-y-8 font-mono">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-steel-800/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-nexus-900/20 border border-nexus-500/30 rounded-lg">
            <Trophy className="text-nexus-500" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-[0.2em] text-ink-100 italic">
              {activeGenre === 'Overall' 
                ? 'Global Rankings' 
                : activeGenre === 'Weekly Challenge' 
                  ? (activeChallenge ? `Challenge: ${activeChallenge.game}` : `Weekly Challenge`)
                  : `${activeGenre} Circuit`}
            </h1>
            <p className="text-ink-500 text-[10px] uppercase tracking-widest mt-1">
              {activeGenre === 'Overall' 
                ? 'Multi-discipline Universal Skill Rating (USR) index.' 
                : activeGenre === 'Weekly Challenge'
                  ? (activeChallenge 
                      ? `${activeChallenge.description || `Weekly challenge for ${activeChallenge.game}.`}`
                      : `Fastest lap wins. Auto-rotating weekly challenge.`
                    )
                  : `Active Discipline: ${activeGenre.toUpperCase()}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Friends Tab */}
            <button
              onClick={() => { setActiveGenre('Friends'); setActiveGame('All'); }}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-md flex items-center gap-2 whitespace-nowrap ${
                activeGenre === 'Friends' ? 'bg-victory-500 text-steel-950 shadow-[0_0_20px_rgba(0,230,118,0.3)]' : 'text-ink-500 hover:text-ink-300 hover:bg-steel-900'
              }`}
            >
              <Users size={12} /> Friends
            </button>
          <div className="flex items-center gap-1 bg-steel-950/80 p-1 border border-steel-700 rounded-lg backdrop-blur-md">
            {myCrew && (
              <button
                onClick={() => { setActiveGenre('My Crew'); setActiveGame('All'); }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-md flex items-center gap-2 whitespace-nowrap ${
                  activeGenre === 'My Crew' ? 'bg-rank-gold text-steel-950 shadow-[0_0_20px_rgba(255,215,0,0.4)]' : 'text-ink-500 hover:text-ink-300 hover:bg-steel-900'
                }`}
              >
                [{myCrew.tag}] MY CREW
              </button>
            )}
            <button
              onClick={() => { setActiveGenre('Overall'); setActiveGame('All'); }}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-md flex items-center gap-2 whitespace-nowrap ${
                activeGenre === 'Overall' ? 'bg-nexus-500 text-steel-950 shadow-[0_0_20px_rgba(45,212,191,0.4)]' : 'text-ink-500 hover:text-ink-300 hover:bg-steel-900'
              }`}
            >
              OVERALL
            </button>
            <button
              onClick={() => { setActiveGenre('Weekly Challenge'); setActiveGame('All'); }}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-md flex items-center gap-2 whitespace-nowrap ${
                activeGenre === 'Weekly Challenge' ? 'bg-pulse-500 text-steel-950 shadow-[0_0_20px_rgba(0,255,231,0.4)]' : 'text-ink-500 hover:text-ink-300 hover:bg-steel-900'
              }`}
            >
              WEEKLY CHALLENGE
            </button>
            {Object.keys(GENRES).map(g => (
              <button
                key={g}
                onClick={() => { setActiveGenre(g); setActiveGame('All'); }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-md flex items-center gap-2 whitespace-nowrap ${
                  activeGenre === g ? 'bg-nexus-500 text-steel-950 shadow-[0_0_20px_rgba(45,212,191,0.4)]' : 'text-ink-500 hover:text-ink-300 hover:bg-steel-900'
                }`}
              >
                {genreIcons[g]} {g}
              </button>
            ))}
          </div>

          {/* Sub-Game Selector */}
          {activeGenre !== 'Overall' && activeGenre !== 'Weekly Challenge' && availableGames.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <div className="h-8 w-[1px] bg-steel-700 hidden md:block mx-2" />
              <div className="relative">
                <button 
                  onClick={() => setShowGameSelect(!showGameSelect)}
                  className="bg-steel-900 border border-steel-700 px-3 py-1 rounded text-[10px] font-black uppercase text-ink-100 flex items-center gap-2 min-w-[140px] justify-between hover:border-nexus-500 transition-colors"
                >
                  {activeGame === 'All' ? `ALL ${activeGenre}S` : activeGame}
                  <ChevronDown size={12} className={`transition-transform ${showGameSelect ? 'rotate-180' : ''}`} />
                </button>
                
                {showGameSelect && (
                  <div className="absolute right-0 mt-1 w-full bg-steel-900 border border-steel-700 rounded shadow-2xl z-50 overflow-hidden">
                    <button 
                      onClick={() => { setActiveGame('All'); setShowGameSelect(false); }}
                      className="w-full text-left px-3 py-2 text-[10px] uppercase font-bold text-ink-300 hover:bg-nexus-900/30 hover:text-nexus-400 border-b border-steel-800"
                    >
                      All {activeGenre}s
                    </button>
                    {availableGames.map(game => (
                      <button 
                        key={game}
                        onClick={() => { setActiveGame(game); setShowGameSelect(false); }}
                        className="w-full text-left px-3 py-2 text-[10px] uppercase font-bold text-ink-300 hover:bg-nexus-900/30 hover:text-nexus-400"
                      >
                        {game}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FRIENDS LEADERBOARD ── */}
      {activeGenre === 'Friends' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-victory-900/10 border border-victory-500/20 rounded-lg px-5 py-3 flex items-center gap-3">
            <Users size={16} className="text-victory-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-ink-100">
                {loading ? 'Loading...' : `${friendBoard.length} operator${friendBoard.length !== 1 ? 's' : ''} in your circle`}
              </p>
              {friendBoard.length > 1 && !loading && (() => {
                const me = friendBoard.find(f => f.isMe)
                if (!me) return null
                const ahead = friendBoard.filter(f => !f.isMe && f.delta > 0).length
                const behind = friendBoard.filter(f => !f.isMe && f.delta < 0).length
                return (
                  <p className="text-[10px] font-mono text-ink-500 uppercase mt-0.5">
                    Rank #{me.rank} of {friendBoard.length} · {ahead > 0 ? `${ahead} ahead of you` : 'You\'re leading'}{behind > 0 ? ` · ${behind} trailing` : ''}
                  </p>
                )
              })()}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-ink-700 italic uppercase text-[10px] tracking-[0.3em]">
              SCANNING FRIEND NETWORK...
            </div>
          ) : friendBoard.length === 0 ? (
            <div className="bg-steel-950 border border-steel-800 rounded-lg py-16 flex flex-col items-center gap-3 text-ink-600">
              <Users size={32} className="opacity-20" />
              <p className="text-xs font-mono uppercase tracking-wider">No friends connected yet</p>
              <p className="text-[10px] font-body text-ink-700 max-w-xs text-center">
                Visit an operator's profile to send them a friend request — then their ranks will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-steel-950 border border-steel-800 rounded overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-steel-800 bg-steel-900/50">
                    <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500 w-16">Rank</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500">Operator</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500 hidden md:table-cell">Streak</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500 text-right">Delta</th>
                    <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500 text-right w-24">USR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-800/50">
                  {friendBoard.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-steel-900/50 transition-colors group ${entry.isMe ? 'bg-nexus-900/10 border-l-2 border-nexus-500' : ''}`}
                    >
                      <td className="py-4 px-6">
                        <span className={`font-black italic text-lg ${entry.rank === 1 ? 'text-rank-gold' : entry.rank === 2 ? 'text-rank-silver' : entry.rank === 3 ? 'text-rank-bronze' : 'text-steel-700'}`}>
                          #{String(entry.rank).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          to={`/app/profile/${entry.id}`}
                          className="font-bold text-ink-100 group-hover:text-nexus-400 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded bg-steel-900 border border-steel-700 overflow-hidden flex-shrink-0 group-hover:border-nexus-500 transition-colors">
                            {entry.avatar_url && <img src={entry.avatar_url} className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <span className="truncate uppercase tracking-wider block">{entry.username}</span>
                            {entry.isMe && (
                              <span className="text-[9px] font-mono text-nexus-400 uppercase tracking-wider">You</span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="py-4 px-6 hidden md:table-cell">
                        <StreakWidget playStreak={entry.play_streak} winStreak={0} compact />
                      </td>
                      <td className="py-4 px-6 text-right">
                        {entry.isMe ? (
                          <span className="text-ink-600 text-xs font-mono">—</span>
                        ) : (
                          <div className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${
                            entry.delta > 0 ? 'text-threat-500' : entry.delta < 0 ? 'text-victory-500' : 'text-ink-500'
                          }`}>
                            {entry.delta > 0 ? <TrendingUp size={12} /> : entry.delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                            {entry.delta > 0 ? '+' : ''}{entry.delta}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-block px-3 py-1 border rounded font-black italic bg-nexus-900/30 border-nexus-500/20 text-nexus-400">
                          {entry.usr}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Podium — only for non-Friends tabs */}
      {activeGenre !== 'Friends' && activeGenre !== 'My Crew' && top3.length > 0 && (
        <div className="flex items-end justify-center gap-2 sm:gap-6 pt-12 pb-8">
          {/* 2nd Place */}
          {top3[1] && (
            <Link to={`/app/profile/${top3[1].id}`} className="flex flex-col items-center group w-24 sm:w-32 animate-in slide-in-from-bottom-4 duration-500 delay-100">
              <Medal size={24} className="text-steel-400 mb-2" />
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-steel-900 rounded border-2 border-steel-500 overflow-hidden mb-3 group-hover:scale-110 transition-transform shadow-xl">
                {top3[1].avatar_url ? <img src={top3[1].avatar_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" /> : null}
              </div>
              <span className="font-bold text-ink-100 text-[10px] truncate w-full text-center uppercase tracking-widest">{top3[1].username}</span>
              <span className="text-sm font-black text-nexus-400 mt-1">
                {getRatingValue(top3[1])}
              </span>
              <div className="w-full h-24 sm:h-32 bg-steel-900 border-x border-t border-steel-500 mt-4 flex items-start justify-center pt-2">
                <span className="font-black text-2xl text-steel-500/50">02</span>
              </div>
            </Link>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <Link to={`/app/profile/${top3[0].id}`} className="flex flex-col items-center group w-28 sm:w-40 animate-in slide-in-from-bottom-8 duration-500">
              <Crown size={32} className="text-nexus-400 mb-2 drop-shadow-[0_0_12px_rgba(45,212,191,0.5)] animate-bounce" />
              <div className="w-20 h-20 sm:w-28 sm:h-28 bg-steel-900 rounded border-4 border-nexus-500 overflow-hidden mb-3 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(45,212,191,0.2)]">
                {top3[0].avatar_url ? <img src={top3[0].avatar_url} className="w-full h-full object-cover" /> : null}
              </div>
              <span className="font-bold text-ink-100 text-sm truncate w-full text-center uppercase tracking-[0.2em]">{top3[0].username}</span>
              <span className="text-xl font-black text-nexus-400 mt-1 italic tracking-tighter">
                {getRatingValue(top3[0])}
              </span>
              <div className="w-full h-32 sm:h-44 bg-nexus-900/20 border-x border-t border-nexus-500 mt-4 flex items-start justify-center pt-2 relative">
                <div className="absolute inset-x-0 top-0 h-1 bg-nexus-500 shadow-[0_0_10px_rgba(45,212,191,1)]" />
                <span className="font-black text-4xl text-nexus-500 drop-shadow-md">01</span>
              </div>
            </Link>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <Link to={`/app/profile/${top3[2].id}`} className="flex flex-col items-center group w-24 sm:w-32 animate-in slide-in-from-bottom-2 duration-500 delay-200">
              <Medal size={24} className="text-[#cd7f32] mb-2" />
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-steel-900 rounded border-2 border-[#cd7f32]/50 overflow-hidden mb-3 group-hover:scale-110 transition-transform shadow-xl">
                {top3[2].avatar_url ? <img src={top3[2].avatar_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" /> : null}
              </div>
              <span className="font-bold text-ink-100 text-[10px] truncate w-full text-center uppercase tracking-widest">{top3[2].username}</span>
              <span className="text-sm font-black text-nexus-400 mt-1">
                {getRatingValue(top3[2])}
              </span>
              <div className="w-full h-20 sm:h-24 bg-steel-900 border-x border-t border-[#cd7f32]/50 mt-4 flex items-start justify-center pt-2">
                <span className="font-black text-2xl text-[#cd7f32]/30">03</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Roster Table — not shown on Friends tab */}
      {activeGenre !== 'Friends' && (
      <div className="bg-steel-950 border border-steel-800 rounded overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-steel-800 bg-steel-900/50">
              <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500 w-20">Node</th>
              <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500">Operator</th>
              <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500 hidden md:table-cell">Tier</th>
              <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500 text-right">
                {activeGenre === 'Overall' ? 'Global Metrics' : activeGenre === 'Weekly Challenge' ? 'SUBMITTED' : activeGenre === 'Shooter' ? 'K/D · WIN %' : 'DISCIPLINE STATS'}
              </th>
              <th className="py-4 px-6 text-[10px] uppercase tracking-widest text-ink-500 text-right w-32">
                {activeGenre === 'Overall' ? 'USR' : activeGenre === 'Weekly Challenge' ? ((activeChallenge?.genre === 'Racing' || !activeChallenge) ? 'BEST TIME' : 'BEST RECORD') : activeGenre === 'Puzzle' ? 'HIGH SCORE' : 'RATING'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-800/50">
            {rest.length > 0 ? rest.map((profile, index) => (
              <tr key={profile.id} className="hover:bg-steel-900/50 transition-colors group">
                <td className="py-4 px-6 text-steel-700 font-black italic">
                  #{String(index + 4).padStart(2, '0')}
                </td>
                <td className="py-4 px-6">
                  <Link to={`/app/profile/${profile.id}`} className="font-bold text-ink-100 group-hover:text-nexus-400 transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-steel-900 border border-steel-700 overflow-hidden flex-shrink-0 group-hover:border-nexus-500 transition-colors">
                      {profile.avatar_url && <img src={profile.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                    <span className="truncate uppercase tracking-wider">{profile.username}</span>
                  </Link>
                </td>
                <td className="py-4 px-6 hidden md:table-cell">
                  <TierBadge rating={activeGenre === 'Overall' || activeGenre === 'Weekly Challenge' ? (profile.usr || 1000) : (profile.genre_ratings?.[activeGenre]?.rating || 1000)} />
                </td>
                <td className="py-4 px-6 text-right">
                  {getMetricSummary(profile)}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className={`inline-block px-3 py-1 border rounded font-black italic ${activeGenre === 'Weekly Challenge' ? 'bg-pulse-900/20 border-pulse-500/30 text-pulse-400' : activeGenre === 'Puzzle' ? 'bg-victory-900/20 border-victory-500/30 text-victory-400' : 'bg-nexus-900/30 border-nexus-500/20 text-nexus-400'}`}>
                    {getRatingValue(profile)}
                  </div>
                </td>
              </tr>
            )) : null}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-ink-700 italic uppercase text-[10px] tracking-[0.3em]">
                  {loading ? 'CALIBRATING DATA STREAM...' : 'No operator data found in current cluster.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
