import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTournaments, getTournamentMatches, calculateStandings, updateMatchScore, registerForTournament, checkRegistration, startTournament, submitPrediction, getPredictions } from '../services/tournamentService'
import type { Tournament, TournamentMatch } from '../services/tournamentService'
import { getActiveCircuits } from '../services/circuitService'
import type { Circuit } from '../services/circuitService'
import { useAuth } from '../context/AuthContext'
import { Trophy, Calendar, Users, ChevronRight, Swords, GitMerge, List, Play, Edit3, X, ChevronLeft, Shield, CheckCircle, Trash2, Crosshair, Plus } from 'lucide-react'
import Button from '../components/Button'
import toast from 'react-hot-toast'
import { sessionService } from '../services/sessionService'
import { supabase } from '../services/supabase'

// --- Components from reference ---

const DynamicMatchCard: React.FC<{ match: TournamentMatch; onReport: (m: TournamentMatch) => void; isAdmin: boolean; userId?: string }> = ({ match, onReport, isAdmin, userId }) => {
  const isCompleted = match.status === 'completed';
  const isScheduled = match.status === 'scheduled';
  
  if (match.is_ffa) {
    return (
      <div className={`relative bg-steel-900 border ${isCompleted ? 'border-steel-800' : 'border-nexus-500/30 shadow-lg shadow-nexus-500/5'} rounded overflow-hidden w-56 shrink-0 transition-all p-3 flex flex-col justify-between h-32`}>
        <div className="absolute top-0 right-0 bg-steel-950 text-[9px] px-2 py-0.5 text-ink-500 rounded-bl">
           {match.group_name}
        </div>
        <div>
           <div className="text-[10px] text-ink-500 uppercase font-bold mb-1">
              Round {match.round} - FFA
           </div>
           <div className="text-sm font-bold text-ink-50 mb-2">
              {match.group_name} Matchup
           </div>
           <div className="text-xs text-ink-400">
              <Users size={12} className="inline mr-1" />
              {match.ffa_results?.length || 0} Players
           </div>
        </div>
        <div className="flex justify-between items-center mt-2 border-t border-steel-800 pt-2">
           <span className={`text-[10px] font-bold uppercase ${isCompleted ? 'text-victory-500' : 'text-ink-500'}`}>
              {isCompleted ? 'Completed' : 'Scheduled'}
           </span>
           {isAdmin && isScheduled && (
             <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => onReport(match)}>
                Report
             </Button>
           )}
        </div>
      </div>
    );
  }

  const winnerIdx = match.winner_id === match.player1_id ? 0 : match.winner_id === match.player2_id ? 1 : -1;
  const isParticipant = userId && (match.player1?.id === userId || match.player2?.id === userId);
  const opponentId = match.player1?.id === userId ? match.player2?.id : match.player1?.id;

  return (
    <div className={`relative bg-steel-900 border ${isCompleted ? 'border-steel-800' : 'border-nexus-500/30 shadow-lg shadow-nexus-500/5'} rounded overflow-hidden w-56 shrink-0 transition-all`}>
      <div className="absolute -top-5 left-0 text-[10px] text-ink-500 uppercase font-bold">
         {match.round === 1 ? 'Round 1' : match.round === 2 ? 'Semi Final' : match.round === 3 ? 'Final' : `Round ${match.round}`}
      </div>
      <div className={`flex justify-between items-center px-3 py-2 border-b border-steel-800/50 ${winnerIdx === 0 ? 'bg-victory-900/20' : ''}`}>
         <span className={`text-sm truncate max-w-[70%] ${winnerIdx === 0 ? 'text-victory-400 font-bold' : 'text-ink-300'}`}>{match.player1?.username || 'TBD'}</span>
         <span className="font-mono text-xs text-ink-500">{isCompleted ? match.score1 : '-'}</span>
      </div>
      <div className={`flex justify-between items-center px-3 py-2 ${winnerIdx === 1 ? 'bg-victory-900/20' : ''}`}>
         <span className={`text-sm truncate max-w-[70%] ${winnerIdx === 1 ? 'text-victory-400 font-bold' : 'text-ink-300'}`}>{match.player2?.username || 'TBD'}</span>
         <span className="font-mono text-xs text-ink-500">{isCompleted ? match.score2 : '-'}</span>
      </div>
      {((isAdmin || isParticipant)) && isScheduled && (
         <button onClick={() => onReport(match)} className="absolute right-2 top-2 bg-steel-800 hover:bg-nexus-600 text-ink-400 hover:text-white p-1.5 rounded-full transition-colors shadow-lg z-10" title="Report Score">
            <Edit3 size={12} />
         </button>
      )}
      {isParticipant && opponentId && isScheduled && (
         <Link to={`/app/versus/${opponentId}?match_id=${match.id}`} className="absolute bottom-2 right-2 bg-pulse-500/20 hover:bg-pulse-500 text-pulse-400 hover:text-steel-950 p-1.5 rounded-full transition-colors shadow-[0_0_10px_rgba(0,255,231,0.2)] z-10" title="View Match Intel">
            <Swords size={12} />
         </Link>
      )}
    </div>
  );
};

const DynamicBracket: React.FC<{ matches: TournamentMatch[]; onReport: (m: TournamentMatch) => void; isAdmin: boolean; userId?: string }> = ({ matches = [], onReport, isAdmin, userId }) => {
   const rounds = (matches || []).reduce((acc, m) => {
      acc[m.round] = acc[m.round] || [];
      acc[m.round].push(m);
      return acc;
   }, {} as Record<number, TournamentMatch[]>);
   const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
   return (
      <div className="overflow-x-auto p-4 md:p-8 touch-auto bg-steel-950/50 rounded-xl border border-steel-800">
         <div className="flex gap-8 md:gap-12 min-w-max items-center">
            {roundNumbers.map(r => (
               <div key={r} className="flex flex-col justify-around gap-12">
                  <div className="text-center">
                     <span className="text-[10px] font-mono font-bold text-ink-500 uppercase tracking-widest border-b border-steel-800 pb-1 px-4">
                        Round {r === roundNumbers.length ? 'Finals' : r}
                     </span>
                  </div>
                  <div className="flex flex-col gap-12">
                    {rounds[r].map(m => (
                       <DynamicMatchCard key={m.id} match={m} onReport={onReport} isAdmin={isAdmin} userId={userId} />
                    ))}
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
};

const DynamicLeagueTable: React.FC<{ registrations: any[]; matches: TournamentMatch[]; }> = ({ registrations = [], matches = [] }) => {
  const standings = calculateStandings(registrations, matches);
  const pools = (standings || []).reduce((acc, curr) => {
    const poolName = curr?.groupName || 'General';
    if (!acc[poolName]) acc[poolName] = [];
    acc[poolName].push(curr);
    return acc;
  }, {} as Record<string, typeof standings>);

  return (
    <div className="space-y-8">
       {Object.entries(pools).map(([poolName, poolStandings]) => (
          <div key={poolName} className="overflow-hidden rounded-lg border border-steel-800 bg-steel-900/30">
            {poolName !== 'General' && (
               <div className="bg-steel-900 px-6 py-3 font-bold text-nexus-400 font-display uppercase text-xs border-b border-steel-800 tracking-widest flex items-center gap-2">
                  <Trophy size={14} /> {poolName} Sector Standings
               </div>
            )}
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left whitespace-nowrap">
                 <thead className="text-[10px] text-ink-500 uppercase font-mono bg-steel-900/80 border-b border-steel-800">
                   <tr>
                     <th className="px-6 py-4">Rank</th>
                     <th className="px-6 py-4">Operator</th>
                     <th className="px-6 py-4 text-center">Played</th>
                     <th className="px-6 py-4 text-center">W - L</th>
                     <th className="px-6 py-4 text-right">Score Delta</th>
                     <th className="px-6 py-4 text-right">Points</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-steel-800 bg-steel-900/10">
                   {poolStandings.map((row, index) => (
                     <tr key={row?.id} className="hover:bg-steel-800/30 transition-colors group">
                       <td className="px-6 py-4 font-mono text-ink-100">
                          {index === 0 ? <span className="text-pulse-400 font-bold">#1</span> : `#${index + 1}`}
                       </td>
                       <td className="px-6 py-4 text-ink-100 font-bold group-hover:text-nexus-400 transition-colors">{row?.name}</td>
                       <td className="px-6 py-4 text-center text-ink-400">{row?.played}</td>
                       <td className="px-6 py-4 text-center text-ink-300">
                         <span className="text-victory-500">{row?.wins}</span> - <span className="text-red-500">{row?.losses}</span>
                       </td>
                       <td className={`px-6 py-4 text-right font-mono ${row?.scoreDiff > 0 ? 'text-victory-400' : 'text-ink-500'}`}>
                          {row?.scoreDiff > 0 ? `+${row?.scoreDiff}` : row?.scoreDiff}
                       </td>
                       <td className="px-6 py-4 text-right font-bold text-nexus-400">{row?.points} pts</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
       ))}
    </div>
  );
};

export default function Tournaments() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.is_admin || user?.role === 'admin'
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [viewingTournamentId, setViewingTournamentId] = useState<string | null>(null)
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [reportingMatch, setReportingMatch] = useState<TournamentMatch | null>(null)
  const [gameResults, setGameResults] = useState<{winner: 'p1'|'p2'|null, p1Perfect: boolean, p2Perfect: boolean}[]>([{ winner: null, p1Perfect: false, p2Perfect: false }]);

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getTournaments(['upcoming', 'active', 'completed']),
      getActiveCircuits(),
      sessionService.getAllSessions()
    ]).then(([tournamentsRes, circuitsRes, sessionsRes]) => {
      if (cancelled) return
      setTournaments(tournamentsRes.data || [])
      setCircuits(circuitsRes.data || [])
      setSessions(sessionsRes.data || [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
     if (viewingTournamentId) {
        getTournamentMatches(viewingTournamentId).then((res: { data: TournamentMatch[] }) => {
           setTournamentMatches(res.data || [])
        })
        if (user) {
           checkRegistration(viewingTournamentId, user.id).then(res => {
              setIsRegistered(res.isRegistered)
           })
        }
     }
  }, [viewingTournamentId, user])

  const handleReportSubmit = async () => {
    if (!reportingMatch) return
    let s1 = 0;
    let s2 = 0;
    gameResults.forEach(g => {
      if (g.winner === 'p1') s1++;
      if (g.winner === 'p2') s2++;
    });

    const winnerId = s1 > s2 ? reportingMatch.player1_id! : (s2 > s1 ? reportingMatch.player2_id! : null)
    
    // We pass s1 and s2 to updateMatchScore
    const { success, error } = await updateMatchScore(reportingMatch.id, s1, s2, winnerId || '')
    if (success) {
      toast.success("SCORE LOGGED")
      setReportingMatch(null)
      setGameResults([{ winner: null, p1Perfect: false, p2Perfect: false }])
      // Refresh matches
      if (viewingTournamentId) {
         const res = await getTournamentMatches(viewingTournamentId)
         setTournamentMatches(res.data || [])
      }
    } else {
      toast.error("Log failed: " + error?.message)
    }
  }

  const handleRegister = async () => {
    if (!viewingTournamentId || !user) return
    setRegistering(true)
    const { success, error } = await registerForTournament(viewingTournamentId, user.id)
    setRegistering(false)
    if (success) {
      toast.success("REGISTRATION CONFIRMED")
      setIsRegistered(true)
    } else {
      toast.error("Registration failed: " + error?.message)
    }
  }

  const viewingTournament = tournaments.find(t => t.id === viewingTournamentId)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-nexus-400 font-mono text-sm animate-pulse">LOADING LOGISTICS...</div>
    </div>
  )

  return (
    <div className="flex-1 w-full bg-steel-950 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-12">
        
        {/* Title & Stats Overview */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-steel-800 pb-8">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <Shield size={18} className="text-nexus-500" />
                 <span className="text-ink-400 font-mono text-[10px] uppercase tracking-[0.3em] font-bold">Tactical Engagement Center</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-display font-black text-ink-50 uppercase tracking-tighter leading-none italic">
                Tournament Operations
              </h1>
           </div>
           <div className="flex gap-4">
              <div className="bg-steel-900 border border-steel-800 p-4 rounded-xl flex flex-col min-w-[120px]">
                 <span className="text-[10px] font-mono text-ink-500 uppercase">Live Ops</span>
                 <span className="text-2xl font-display font-bold text-pulse-400">{tournaments.filter(t => t.status === 'active').length}</span>
              </div>
              <div className="bg-steel-900 border border-steel-800 p-4 rounded-xl flex flex-col min-w-[120px]">
                 <span className="text-[10px] font-mono text-ink-500 uppercase">Planned</span>
                 <span className="text-2xl font-display font-bold text-nexus-400">{tournaments.filter(t => t.status === 'upcoming').length}</span>
              </div>
           </div>
        </div>

        {/* Circuits Section (Carousel or Grid) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display uppercase tracking-widest text-ink-100 flex items-center gap-3">
              <Trophy size={20} className="text-nexus-500" /> Active Circuits
            </h2>
            <div className="h-px flex-1 bg-steel-800 mx-6 opacity-30"></div>
          </div>
          
          {circuits.length === 0 ? (
            <div className="bg-steel-900/30 border border-steel-800 border-dashed rounded-xl p-12 text-center text-ink-500 font-mono text-sm uppercase tracking-widest">
              No active circuits in this jurisdiction.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {circuits.map(circuit => (
                <Link 
                  key={circuit.id} 
                  to={`/app/circuit/${circuit.id}`}
                  className="group relative h-56 rounded-2xl overflow-hidden border border-steel-800 hover:border-nexus-500 transition-all duration-500 flex flex-col justify-end p-6 shadow-2xl"
                >
                  <div className="absolute inset-0 bg-steel-900">
                    {circuit.background_url && (
                      <img src={circuit.background_url} alt="bg" className="w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-50 group-hover:scale-110 transition-all duration-700" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-steel-950 via-steel-950/80 to-transparent" />
                  </div>
                  
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest bg-nexus-900/30 text-nexus-400 border border-nexus-400/20">
                         {circuit.status}
                       </span>
                       <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">{circuit.season || 'S01'}</span>
                    </div>
                    <h3 className="text-2xl font-display font-black text-ink-50 uppercase tracking-widest group-hover:text-nexus-400 transition-colors drop-shadow-lg">
                      {circuit.name}
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-ink-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Calendar size={12} className="text-nexus-500" /> Ends {new Date(circuit.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Hover Accent */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-nexus-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Tournaments Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display uppercase tracking-widest text-ink-100 flex items-center gap-3">
              <Swords size={20} className="text-pulse-400" /> Engagement Roster
            </h2>
            <div className="h-px flex-1 bg-steel-800 mx-6 opacity-30"></div>
          </div>
          
          {tournaments.length === 0 ? (
            <div className="bg-steel-900/30 border border-steel-800 border-dashed rounded-xl p-12 text-center text-ink-500 font-mono text-sm uppercase tracking-widest">
              Encryption active. No ops visible.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {tournaments.map(tournament => {
                const circuitName = (tournament as any).circuits?.name;
                const isOngoing = tournament.status === 'active';
                const isCompleted = tournament.status === 'completed';

                return (
                  <div key={tournament.id} className="bg-steel-900/50 border border-steel-800 hover:border-steel-600 rounded-2xl p-5 flex flex-col sm:flex-row gap-6 transition-all group relative overflow-hidden">
                    {isOngoing && <div className="absolute top-0 left-0 w-1 h-full bg-pulse-500 animate-pulse"></div>}

                    {isAdmin && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to completely delete the Tournament "${tournament.name}"?`)) {
                            const { error } = await supabase.from('tournaments').delete().eq('id', tournament.id);
                            if (error) {
                              toast.error("Deletion failed: " + error.message);
                            } else {
                              toast.success("TOURNAMENT DELETED");
                              setTournaments(prev => prev.filter(t => t.id !== tournament.id));
                            }
                          }
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded bg-threat-900/20 hover:bg-threat-900/50 text-threat-500 border border-threat-500/30 opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center justify-center"
                        title="Delete Tournament"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}

                    <div className="w-full sm:w-40 h-28 bg-steel-950 rounded-xl border border-steel-800 flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-inner group-hover:border-ink-700 transition-colors">
                      {tournament.image_url ? (
                        <img src={tournament.image_url} alt="T" className="w-full h-full object-cover opacity-40 group-hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" />
                      ) : (
                        <Trophy size={40} className="text-steel-800" />
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          {circuitName && <p className="text-[10px] font-mono text-nexus-500 uppercase tracking-[0.2em]">{circuitName}</p>}
                          <h3 className="text-xl font-display font-bold text-ink-50 tracking-wide uppercase leading-tight">{tournament.name}</h3>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest bg-steel-800 px-2 py-0.5 rounded border border-steel-700">{tournament.game}</span>
                             <span className="text-[10px] font-mono text-nexus-400 uppercase tracking-widest">{tournament.format.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          isOngoing ? 'bg-pulse-500/10 text-pulse-400 border-pulse-500/30 animate-pulse shadow-[0_0_10px_rgba(251,113,133,0.1)]' : 
                          isCompleted ? 'bg-steel-800 text-ink-500 border-steel-700' :
                          'bg-nexus-900/20 text-nexus-400 border-nexus-400/20'
                        }`}>
                          {tournament.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-6 text-[10px] font-mono text-ink-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-ink-600" /> {tournament.start_time ? new Date(tournament.start_time).toLocaleString() : 'TBD'}</span>
                        {tournament.max_participants && (
                          <span className="flex items-center gap-1.5"><Users size={14} className="text-ink-600" /> Max {tournament.max_participants}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-start sm:justify-end items-center sm:pl-6 sm:border-l border-steel-800/50">
                      <Button variant="primary" size="sm" onClick={() => setViewingTournamentId(tournament.id)} className="w-full sm:w-auto h-12 px-6 font-bold tracking-widest italic group-hover:translate-x-1 transition-transform">
                        ENTER <ChevronRight size={18} className="-mr-1 ml-1" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Grand Prix Sessions Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display uppercase tracking-widest text-ink-100 flex items-center gap-3">
              <Trophy size={20} className="text-pulse-400" /> Grand Prix Sessions
            </h2>
            <div className="h-px flex-1 bg-steel-800 mx-6 opacity-30"></div>
          </div>
          
          {sessions.length === 0 ? (
            <div className="bg-steel-900/30 border border-steel-800 border-dashed rounded-xl p-12 text-center text-ink-500 font-mono text-sm uppercase tracking-widest">
              No Grand Prix series currently active.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {sessions.map(session => {
                const circuitName = session.circuits?.name;
                const isOngoing = session.status === 'active';
                const isCompleted = session.status === 'completed';

                return (
                  <div key={session.id} className="bg-steel-900/50 border border-steel-800 hover:border-steel-600 rounded-2xl p-5 flex flex-col sm:flex-row gap-6 transition-all group relative overflow-hidden">
                    {isOngoing && <div className="absolute top-0 left-0 w-1 h-full bg-pulse-500 animate-pulse"></div>}

                    {isAdmin && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to completely delete the Grand Prix Session "${session.name}"?`)) {
                            const { error } = await supabase.from('sessions').delete().eq('id', session.id);
                            if (error) {
                              toast.error("Deletion failed: " + error.message);
                            } else {
                              toast.success("SESSION DELETED");
                              setSessions(prev => prev.filter(s => s.id !== session.id));
                            }
                          }
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded bg-threat-900/20 hover:bg-threat-900/50 text-threat-500 border border-threat-500/30 opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center justify-center"
                        title="Delete Session"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}

                    <div className="w-full sm:w-40 h-28 bg-steel-950 rounded-xl border border-steel-800 flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-inner group-hover:border-ink-700 transition-colors">
                      <Trophy size={40} className="text-steel-800 group-hover:text-pulse-400 transition-colors" />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          {circuitName && <p className="text-[10px] font-mono text-nexus-500 uppercase tracking-[0.2em]">{circuitName}</p>}
                          <h3 className="text-xl font-display font-bold text-ink-50 tracking-wide uppercase leading-tight">{session.name}</h3>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest bg-steel-800 px-2 py-0.5 rounded border border-steel-700">{session.game}</span>
                             <span className="text-[10px] font-mono text-nexus-400 uppercase tracking-widest">{session.current_game} / {session.max_games} GP Rounds</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          isOngoing ? 'bg-pulse-500/10 text-pulse-400 border-pulse-500/30 animate-pulse shadow-[0_0_10px_rgba(251,113,133,0.1)]' : 
                          isCompleted ? 'bg-steel-800 text-ink-500 border-steel-700' :
                          'bg-nexus-900/20 text-nexus-400 border-nexus-400/20'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-6 text-[10px] font-mono text-ink-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-ink-600" /> Created {new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-start sm:justify-end items-center sm:pl-6 sm:border-l border-steel-800/50">
                      <Link to={`/app/session/${session.id}`} className="w-full sm:w-auto">
                        <Button variant="primary" size="sm" className="w-full h-12 px-6 font-bold tracking-widest italic group-hover:translate-x-1 transition-transform">
                          ENTER CONSOLE <ChevronRight size={18} className="-mr-1 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Tournament Detail Modal */}
      {viewingTournament && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-steel-950/95 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="bg-steel-900 border border-steel-700 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] border-t-pulse-500/30">
              {/* Modal Header */}
              <div className="p-8 border-b border-steel-800 flex justify-between items-center bg-steel-900/50 relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nexus-500 via-pulse-500 to-nexus-500 opacity-50"></div>
                 <div className="flex items-center gap-6">
                    <button onClick={() => setViewingTournamentId(null)} className="p-3 hover:bg-steel-800 rounded-2xl text-ink-400 transition-all hover:text-ink-100 hover:scale-110 active:scale-95"><ChevronLeft size={28} /></button>
                    <div>
                       <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-mono text-nexus-400 uppercase tracking-[0.3em] font-bold">{viewingTournament.game} Sector</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-steel-700"></span>
                          <span className="text-[10px] font-mono text-ink-500 uppercase tracking-[0.3em]">{viewingTournament.format.replace('_', ' ')}</span>
                       </div>
                       <h2 className="text-3xl font-display font-black text-ink-50 uppercase tracking-tighter italic">{viewingTournament.name}</h2>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setViewingTournamentId(null)} className="text-ink-500 hover:text-ink-100 p-2 transition-all hover:rotate-90"><X size={32} /></button>
                 </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar bg-steel-950/30">
                  {viewingTournament.status === 'active' || viewingTournament.status === 'completed' ? (
                    <div className="animate-in slide-in-from-bottom-5 duration-700 space-y-8">
                       {viewingTournament.format === 'single_elimination' && (
                         <div className="space-y-8">
                           <div className="flex items-center justify-between">
                              <h3 className="text-sm font-display font-bold text-ink-100 uppercase tracking-[0.3em] flex items-center gap-3">
                                 <GitMerge size={20} className="text-nexus-500" /> Tactical Bracket (Single Elimination)
                              </h3>
                           </div>
                           <DynamicBracket matches={tournamentMatches} onReport={setReportingMatch} isAdmin={isAdmin} userId={user?.id} />
                         </div>
                       )}

                       {viewingTournament.format === 'double_elimination' && (
                         <div className="space-y-12">
                           <div className="space-y-6">
                              <h3 className="text-sm font-display font-bold text-nexus-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                 <GitMerge size={20} className="text-nexus-500" /> Winners Bracket
                              </h3>
                               <DynamicBracket 
                                  matches={tournamentMatches.filter(m => (m as any).bracket_match_id?.startsWith('WB'))} 
                                  onReport={setReportingMatch} 
                                  isAdmin={isAdmin} 
                                  userId={user?.id} 
                               />
                           </div>

                           <div className="space-y-6">
                              <h3 className="text-sm font-display font-bold text-threat-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                 <GitMerge size={20} className="text-threat-500" /> Losers Bracket
                              </h3>
                               <DynamicBracket 
                                  matches={tournamentMatches.filter(m => (m as any).bracket_match_id?.startsWith('LB'))} 
                                  onReport={setReportingMatch} 
                                  isAdmin={isAdmin} 
                                  userId={user?.id} 
                               />
                           </div>

                           <div className="space-y-6">
                              <h3 className="text-sm font-display font-bold text-victory-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                 <Trophy size={20} className="text-victory-500" /> Grand Finals
                              </h3>
                               <DynamicBracket 
                                  matches={tournamentMatches.filter(m => (m as any).bracket_match_id?.startsWith('GF'))} 
                                  onReport={setReportingMatch} 
                                  isAdmin={isAdmin} 
                                  userId={user?.id} 
                               />
                           </div>
                         </div>
                       )}

                       {(viewingTournament.format === 'round_robin' || viewingTournament.format === 'ffa_league') && (
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2 space-y-8">
                               <h3 className="text-sm font-display font-bold text-ink-100 uppercase tracking-[0.3em] flex items-center gap-3 italic">
                                  <List size={20} className="text-pulse-400" /> Sector Standings
                                </h3>
                               <DynamicLeagueTable registrations={[]} matches={tournamentMatches} />
                            </div>
                            <div className="space-y-8">
                               <h3 className="text-sm font-display font-bold text-ink-100 uppercase tracking-[0.3em] flex items-center gap-3 italic">
                                  <Play size={20} className="text-nexus-500" /> Match Log
                               </h3>
                               <div className="bg-steel-900/50 border border-steel-800 rounded-2xl overflow-hidden shadow-2xl">
                                  <div className="max-h-[600px] overflow-y-auto p-4 space-y-3 custom-scrollbar divide-y divide-steel-800/50">
                                     {tournamentMatches.length === 0 ? (
                                        <div className="py-20 text-center text-ink-600 font-mono text-[10px] uppercase tracking-widest">Awaiting sector engagement...</div>
                                     ) : (
                                        tournamentMatches.map(m => (
                                           <div key={m.id} className="pt-3 first:pt-0 group">
                                              <div className="flex justify-between items-center mb-2 text-[9px] font-mono text-ink-500 uppercase">
                                                 <span>Match ID: {m.id.split('-')[0]}</span>
                                                 <span className={m.status === 'completed' ? 'text-victory-500 font-bold' : 'text-nexus-500'}>{m.status}</span>
                                              </div>
                                              <div className="flex items-center justify-between p-3 rounded-lg bg-steel-950/50 border border-steel-800 group-hover:border-ink-700 transition-colors">
                                                 <div className="flex flex-col gap-1 flex-1">
                                                    <div className="flex justify-between items-center pr-4">
                                                       <span className={`text-sm font-bold ${m.winner_id === m.player1_id ? 'text-victory-400' : 'text-ink-200'}`}>{m.player1?.username || 'TBD'}</span>
                                                       <span className="font-mono text-sm text-ink-500">{m.status === 'completed' ? m.score1 : '-'}</span>
                                                    </div>
                                                    <div className="h-px bg-steel-800 w-full my-1"></div>
                                                    <div className="flex justify-between items-center pr-4">
                                                       <span className={`text-sm font-bold ${m.winner_id === m.player2_id ? 'text-victory-400' : 'text-ink-200'}`}>{m.player2?.username || 'TBD'}</span>
                                                       <span className="font-mono text-sm text-ink-500">{m.status === 'completed' ? m.score2 : '-'}</span>
                                                    </div>
                                                 </div>
                                                 {(isAdmin || (m.player1?.id === user?.id || m.player2?.id === user?.id)) && m.status === 'scheduled' && (
                                                    <Button size="sm" variant="ghost" onClick={() => setReportingMatch(m)} className="ml-2 !p-2">
                                                       <Edit3 size={16} />
                                                    </Button>
                                                 )}
                                              </div>
                                           </div>
                                        ))
                                     )}
                                  </div>
                               </div>
                            </div>
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-40 text-center animate-in zoom-in-95 duration-500">
                       <div className="w-32 h-32 rounded-full bg-steel-900 border border-steel-800 relative flex items-center justify-center mb-8 shadow-2xl">
                          <div className="absolute inset-0 rounded-full border-2 border-dashed border-nexus-500 opacity-20 animate-spin-slow"></div>
                          <Trophy size={60} className="text-ink-700 group-hover:scale-110 transition-transform" />
                       </div>
                       <h3 className="text-4xl font-display font-black text-ink-50 mb-3 uppercase tracking-tighter">Registration Channel Open</h3>
                       <p className="text-ink-400 font-mono text-sm uppercase tracking-widest max-w-sm mx-auto mb-10">Awaiting participants for full tactical deployment.</p>
                       <div className="flex gap-6">
                          <Button variant="secondary" onClick={() => setViewingTournamentId(null)} className="px-8 min-w-[160px]">TERMINATE VIEW</Button>
                          {isAdmin && (
                            <Button 
                               variant="primary" 
                               onClick={async () => {
                                  const res = await startTournament(viewingTournament.id);
                                  if (res.success) {
                                     toast.success("TOURNAMENT STARTED");
                                     setViewingTournamentId(null);
                                     const tours = await getTournaments(['upcoming', 'active', 'completed']);
                                     setTournaments(tours.data || []);
                                  } else {
                                     toast.error(res.error?.message || "Failed to start");
                                  }
                               }}
                               className="px-10 min-w-[160px] italic font-black tracking-widest bg-victory-500 text-steel-950 hover:bg-victory-400"
                            >
                               START TOURNAMENT
                            </Button>
                          )}
                           <Button 
                             variant="primary" 
                             disabled={isRegistered || registering}
                             onClick={handleRegister}
                             className="px-10 min-w-[160px] italic font-black tracking-widest bg-nexus-500 text-steel-950 hover:bg-nexus-400"
                          >
                             {registering ? 'ENROLLING...' : isRegistered ? (
                                <span className="flex items-center gap-2"><CheckCircle size={16} /> DEPLOYED</span>
                             ) : 'ENGAGE OPS'}
                          </Button>
                       </div>

                       {/* Pick'em UI for non-participants */}
                       {!isRegistered && (
                         <div className="mt-16 bg-steel-900/50 border border-steel-800 rounded-2xl p-8 max-w-2xl mx-auto">
                            <h4 className="text-xl font-display uppercase tracking-widest text-nexus-400 flex items-center justify-center gap-3 mb-6">
                              <Crosshair size={20} /> Spectator Pick'em
                            </h4>
                            <p className="text-ink-400 font-mono text-xs uppercase tracking-widest mb-6">Predict the champion. Earn 150 Career XP if your intel is correct.</p>
                            <div className="flex items-center justify-center gap-4">
                              <Button 
                                variant="secondary" 
                                onClick={async () => {
                                  const name = window.prompt("Enter the exact operator name of your predicted champion:");
                                  if (name) {
                                    // Fetch user ID
                                    const { data: p } = await supabase.from('profiles').select('id').eq('username', name).single();
                                    if (p && user) {
                                      const res = await submitPrediction(viewingTournament.id, user.id, p.id);
                                      if (res.success) toast.success("PREDICTION LOCKED");
                                      else toast.error("Prediction failed or already locked.");
                                    } else {
                                      toast.error("Operator not found.");
                                    }
                                  }
                                }}
                                className="px-8 font-bold text-[10px] tracking-widest uppercase border-nexus-500/50 hover:border-nexus-500 hover:text-nexus-400 transition-colors"
                              >
                                Lock Prediction
                              </Button>
                            </div>
                         </div>
                       )}
                    </div>
                  )}
              </div>
           </div>
        </div>
      )}

      {/* Score Reporting Modal */}
      {reportingMatch && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-steel-950/90 backdrop-blur-md animate-in zoom-in-95 duration-300">
            <div className="bg-steel-900 border border-steel-700 rounded-3xl p-6 max-w-md w-full shadow-[0_0_80px_rgba(0,0,0,0.9)] border-t-nexus-500/50 max-h-[90vh] flex flex-col">
               <div className="flex items-center gap-3 mb-6 shrink-0">
                  <Edit3 className="text-nexus-500" size={20} />
                  <h2 className="text-xl font-display font-black text-ink-50 uppercase tracking-widest">Log Mission Results</h2>
               </div>
               
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                  <div className="flex justify-between items-end border-b border-steel-800 pb-4 mb-4">
                     <div className="text-center w-1/2">
                        <span className="text-3xl font-bold text-ink-50 block mb-1">{gameResults.filter(g => g.winner === 'p1').length}</span>
                        <label className="text-[10px] text-ink-500 uppercase font-mono tracking-widest font-bold block line-clamp-1 px-2">{reportingMatch.player1?.username || 'P1 UNIT'}</label>
                     </div>
                     <div className="text-center w-1/2">
                        <span className="text-3xl font-bold text-ink-50 block mb-1">{gameResults.filter(g => g.winner === 'p2').length}</span>
                        <label className="text-[10px] text-ink-500 uppercase font-mono tracking-widest font-bold block line-clamp-1 px-2">{reportingMatch.player2?.username || 'P2 UNIT'}</label>
                     </div>
                  </div>

                  <div className="space-y-4">
                     {gameResults.map((game, idx) => (
                        <div key={idx} className="bg-steel-950/50 border border-steel-800 rounded-2xl p-4">
                           <div className="text-xs text-ink-500 uppercase font-mono tracking-widest font-bold mb-4 flex justify-between items-center">
                              <span>Game {idx + 1}</span>
                              {gameResults.length > 1 && (
                                 <button onClick={() => setGameResults(gameResults.filter((_, i) => i !== idx))} className="text-ink-500 hover:text-threat-500 transition-colors"><X size={14}/></button>
                              )}
                           </div>
                           <div className="flex gap-4">
                              <div className="flex-1 space-y-3">
                                 <Button size="sm" variant={game.winner === 'p1' ? 'primary' : 'ghost'} className={`w-full font-bold uppercase tracking-widest text-[10px] ${game.winner === 'p1' ? 'bg-victory-500 text-steel-950 border-victory-500 hover:bg-victory-400' : 'text-ink-400 border-steel-700'}`} onClick={() => { const newResults = [...gameResults]; newResults[idx].winner = 'p1'; newResults[idx].p2Perfect = false; setGameResults(newResults); }}>P1 WON</Button>
                                 {game.winner === 'p1' && (
                                    <label className="flex items-center gap-2 text-[10px] uppercase font-mono font-bold text-ink-400 cursor-pointer justify-center select-none animate-in fade-in">
                                       <input type="checkbox" checked={game.p1Perfect} onChange={e => { const newResults = [...gameResults]; newResults[idx].p1Perfect = e.target.checked; setGameResults(newResults); }} className="rounded border-steel-700 bg-steel-900 text-nexus-500 focus:ring-nexus-500 focus:ring-offset-steel-900 w-3 h-3" />
                                       Perfect
                                    </label>
                                 )}
                              </div>
                              <div className="flex-1 space-y-3">
                                 <Button size="sm" variant={game.winner === 'p2' ? 'primary' : 'ghost'} className={`w-full font-bold uppercase tracking-widest text-[10px] ${game.winner === 'p2' ? 'bg-victory-500 text-steel-950 border-victory-500 hover:bg-victory-400' : 'text-ink-400 border-steel-700'}`} onClick={() => { const newResults = [...gameResults]; newResults[idx].winner = 'p2'; newResults[idx].p1Perfect = false; setGameResults(newResults); }}>P2 WON</Button>
                                 {game.winner === 'p2' && (
                                    <label className="flex items-center gap-2 text-[10px] uppercase font-mono font-bold text-ink-400 cursor-pointer justify-center select-none animate-in fade-in">
                                       <input type="checkbox" checked={game.p2Perfect} onChange={e => { const newResults = [...gameResults]; newResults[idx].p2Perfect = e.target.checked; setGameResults(newResults); }} className="rounded border-steel-700 bg-steel-900 text-nexus-500 focus:ring-nexus-500 focus:ring-offset-steel-900 w-3 h-3" />
                                       Perfect
                                    </label>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                  
                  <Button variant="ghost" className="w-full border border-dashed border-steel-700 text-ink-500 hover:text-ink-200 mt-2 font-mono uppercase text-[10px] tracking-widest py-3" onClick={() => setGameResults([...gameResults, { winner: null, p1Perfect: false, p2Perfect: false }])}>
                     <Plus size={14} className="mr-2" /> Add Next Game
                  </Button>
               </div>

               <div className="flex gap-4 mt-8 pt-6 border-t border-steel-800 shrink-0">
                  <Button variant="secondary" className="flex-1 rounded-xl py-4 font-mono uppercase text-xs tracking-widest" onClick={() => { setReportingMatch(null); setGameResults([{ winner: null, p1Perfect: false, p2Perfect: false }]); }}>Abort</Button>
                  <Button 
                     variant="primary"
                     className="flex-1 rounded-xl py-4 font-black bg-nexus-500 text-steel-950 uppercase tracking-widest hover:bg-nexus-400 disabled:opacity-50" 
                     onClick={handleReportSubmit} 
                     disabled={gameResults.every(g => g.winner === null) || gameResults.filter(g => g.winner === 'p1').length === gameResults.filter(g => g.winner === 'p2').length}
                  >
                     Confirm Score
                  </Button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
