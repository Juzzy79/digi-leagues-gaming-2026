// src/pages/Versus.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfile } from '../services/profileService'
import { getHeadToHeadStats } from '../services/rivalryService'
import { ArrowLeft, Target, Skull, Trophy, Swords, ShieldAlert } from 'lucide-react'
import ChallengeModal from '../components/ChallengeModal'
import Button from '../components/Button'

export default function Versus() {
  const { opponentId } = useParams<{ opponentId: string }>()
  const { user, profile: myProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const queryParams = new URLSearchParams(location.search)
  const matchId = queryParams.get('match_id')

  const [opponent, setOpponent] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showChallengeModal, setShowChallengeModal] = useState(false)

  useEffect(() => {
    if (!user || !opponentId) return
    
    Promise.all([
      getProfile(opponentId),
      getHeadToHeadStats(user.id, opponentId)
    ]).then(([profileRes, statsRes]) => {
      setOpponent(profileRes.data)
      setStats(statsRes.data)
      setLoading(false)
    })
  }, [user, opponentId])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center font-mono text-nexus-400">
      <span className="animate-pulse">LOADING COMBAT DATA...</span>
    </div>
  )

  if (!opponent || !myProfile) return (
    <div className="flex-1 flex items-center justify-center font-mono text-threat-400">
      TARGET NOT FOUND.
    </div>
  )

  const { rivalry, recentMeetings, genreBreakdown } = stats || {}
  const totalMatches = rivalry?.player_wins + rivalry?.rival_wins
  const winRate = totalMatches > 0 ? Math.round((rivalry.player_wins / totalMatches) * 100) : 0

  return (
    <div className="flex-1 p-4 lg:p-8 space-y-8 max-w-6xl mx-auto w-full relative">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-ink-400 hover:text-ink-100 transition-colors font-mono uppercase text-xs"
      >
        <ArrowLeft size={16} /> Retreat
      </button>

      {matchId && (
        <div className="absolute top-0 left-0 w-full h-96 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pulse-500/20 via-steel-950/0 to-steel-950/0 pointer-events-none -z-10 animate-pulse" />
      )}
      {matchId && (
        <div className="text-center mb-12 animate-in slide-in-from-top-10 duration-700">
          <div className="inline-block px-4 py-1 border border-pulse-500/30 bg-pulse-500/10 rounded text-[10px] font-mono text-pulse-400 uppercase tracking-[0.5em] font-bold mb-4 shadow-[0_0_20px_rgba(251,113,133,0.3)]">
            Official Bracket Match
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black uppercase text-transparent bg-clip-text bg-gradient-to-br from-white via-ink-100 to-pulse-400 tracking-tighter drop-shadow-[0_0_30px_rgba(251,113,133,0.3)] italic">
            MAIN EVENT
          </h1>
        </div>
      )}

      {/* VS Header Split */}
      <div className={`flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-0 mt-8 ${matchId ? 'scale-105 transition-transform duration-1000' : ''}`}>
        {/* You */}
        <div className="flex-1 bg-steel-950 border border-steel-700 p-8 rounded-t-lg md:rounded-tr-none md:rounded-l-lg text-center shadow-[inset_0_0_50px_rgba(34,197,94,0.05)]">
          <div className={`w-24 h-24 mx-auto bg-steel-900 border-2 border-victory-500 rounded-full mb-4 overflow-hidden ${matchId ? 'shadow-[0_0_30px_rgba(34,197,94,0.4)]' : ''}`}>
            {myProfile.avatar_url ? (
              <img src={myProfile.avatar_url} alt={myProfile.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-display text-ink-500">{myProfile.username.charAt(0)}</div>
            )}
          </div>
          <h2 className={`font-display font-black uppercase text-ink-100 ${matchId ? 'text-4xl tracking-tighter' : 'text-2xl'}`}>{myProfile.username}</h2>
          <div className="text-nexus-400 font-mono text-sm mt-1">{myProfile.usr || 1000} USR</div>
        </div>

        {/* VS Divider */}
        <div className={`flex items-center justify-center bg-steel-900 border-y border-steel-700 md:border-y-0 md:border-x px-8 py-4 z-10 relative md:-mx-4 shadow-2xl skew-x-[-10deg] ${matchId ? 'bg-steel-800 shadow-[0_0_50px_rgba(251,113,133,0.3)]' : ''}`}>
          <div className="skew-x-[10deg] flex flex-col items-center">
            <Swords size={matchId ? 48 : 32} className={`mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] ${matchId ? 'text-pulse-400 animate-pulse' : 'text-threat-500'}`} />
            <span className={`font-display font-black italic text-ink-100 ${matchId ? 'text-5xl text-transparent bg-clip-text bg-gradient-to-b from-white to-pulse-400' : 'text-3xl'}`}>VS</span>
          </div>
        </div>

        {/* Opponent */}
        <div className="flex-1 bg-steel-950 border border-steel-700 p-8 rounded-b-lg md:rounded-bl-none md:rounded-r-lg text-center shadow-[inset_0_0_50px_rgba(239,68,68,0.05)]">
          <div className={`w-24 h-24 mx-auto bg-steel-900 border-2 border-threat-500 rounded-full mb-4 overflow-hidden ${matchId ? 'shadow-[0_0_30px_rgba(239,68,68,0.4)]' : ''}`}>
            {opponent.avatar_url ? (
              <img src={opponent.avatar_url} alt={opponent.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-display text-ink-500">{opponent.username.charAt(0)}</div>
            )}
          </div>
          <h2 className={`font-display font-black uppercase text-ink-100 ${matchId ? 'text-4xl tracking-tighter' : 'text-2xl'}`}>{opponent.username}</h2>
          <div className="text-threat-400 font-mono text-sm mt-1">{opponent.usr || 1000} USR</div>
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Lifetime Record */}
        <div className="bg-steel-950 border border-steel-700 p-6 rounded-lg text-center">
          <h3 className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-4">Lifetime Record</h3>
          <div className="flex items-center justify-center gap-8 mb-4">
            <div>
              <p className="text-4xl font-display font-black text-victory-500">{rivalry?.player_wins || 0}</p>
              <p className="text-[10px] font-mono text-ink-400 uppercase">Wins</p>
            </div>
            <div className="text-2xl font-black text-steel-600">-</div>
            <div>
              <p className="text-4xl font-display font-black text-threat-500">{rivalry?.rival_wins || 0}</p>
              <p className="text-[10px] font-mono text-ink-400 uppercase">Losses</p>
            </div>
          </div>
          <div className="w-full h-2 bg-steel-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-victory-500" style={{ width: `${winRate}%` }} />
            <div className="h-full bg-threat-500" style={{ width: `${100 - winRate}%` }} />
          </div>
        </div>

        {/* Rivalry Status */}
        <div className="bg-steel-950 border border-steel-700 p-6 rounded-lg text-center flex flex-col items-center justify-center relative overflow-hidden">
          {rivalry?.is_nemesis && (
            <div className="absolute inset-0 bg-threat-900/10 pointer-events-none" />
          )}
          <h3 className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-4 relative z-10">Rivalry Status</h3>
          
          <div className="relative z-10">
            {rivalry?.is_nemesis ? (
              <div className="text-threat-500 flex flex-col items-center">
                <Skull size={32} className="mb-2" />
                <span className="font-display font-black uppercase text-lg tracking-widest">Nemesis Active</span>
                <span className="text-[10px] font-mono mt-1 text-threat-400">Net Score: {rivalry.net_score}</span>
              </div>
            ) : rivalry?.net_score > 0 ? (
              <div className="text-victory-500 flex flex-col items-center">
                <Trophy size={32} className="mb-2" />
                <span className="font-display font-black uppercase text-lg tracking-widest">Dominating</span>
                <span className="text-[10px] font-mono mt-1 text-victory-400">Net Score: +{rivalry.net_score}</span>
              </div>
            ) : (
              <div className="text-ink-300 flex flex-col items-center">
                <ShieldAlert size={32} className="mb-2 text-ink-500" />
                <span className="font-display font-bold uppercase text-sm tracking-widest">Neutral</span>
                <span className="text-[10px] font-mono mt-1 text-ink-500">Net Score: {rivalry?.net_score || 0}</span>
              </div>
            )}
          </div>
        </div>

        {/* Combat Zones */}
        <div className="bg-steel-950 border border-steel-700 p-6 rounded-lg">
          <h3 className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-4 text-center">Combat Zones</h3>
          {Object.keys(genreBreakdown || {}).length === 0 ? (
            <p className="text-[10px] font-mono text-ink-600 text-center uppercase py-4">No data available.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(genreBreakdown).map(([game, data]: [string, any]) => (
                <div key={game} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-ink-300 truncate w-24" title={game}>{game}</span>
                  <div className="flex-1 mx-4 h-1 bg-steel-800 rounded-full flex overflow-hidden">
                    <div className="h-full bg-victory-500" style={{ width: `${(data.wins / (data.wins + data.losses)) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs w-12 text-right">
                    <span className="text-victory-500">{data.wins}</span>-<span className="text-threat-500">{data.losses}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Recent Encounters */}
      <div className="bg-steel-950 border border-steel-700 p-6 rounded-lg">
        <h3 className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-4">Recent Encounters (Last 5)</h3>
        {recentMeetings && recentMeetings.length > 0 ? (
          <div className="flex justify-center gap-2">
            {recentMeetings.map((m: any, i: number) => (
              <div 
                key={m.id} 
                className={`w-12 h-12 rounded border-2 flex items-center justify-center font-display font-black text-lg ${
                  m.didWin 
                    ? 'bg-victory-900/20 border-victory-500 text-victory-500' 
                    : 'bg-threat-900/20 border-threat-500 text-threat-500'
                }`}
                title={`${m.game} on ${new Date(m.date).toLocaleDateString()}`}
              >
                {m.didWin ? 'W' : 'L'}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] font-mono text-ink-600 text-center uppercase py-4">No recent history logged.</p>
        )}
      </div>

      <div className="pt-8 text-center">
        <Button 
          variant="danger" 
          size="lg" 
          onClick={() => setShowChallengeModal(true)}
          className="w-full max-w-sm font-black tracking-[0.2em] py-4 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse"
        >
          <Target size={24} className="mr-2" /> CHALLENGE NOW
        </Button>
      </div>

      {showChallengeModal && (
        <ChallengeModal 
          opponentId={opponentId!} 
          opponentName={opponent.username} 
          onClose={() => setShowChallengeModal(false)} 
        />
      )}
    </div>
  )
}
