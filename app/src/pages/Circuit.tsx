import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCircuit, getCircuitStandings } from '../services/circuitService'
import type { Circuit } from '../services/circuitService'
import { getTournamentsByCircuit, registerForTournament, checkRegistration } from '../services/tournamentService'
import type { Tournament } from '../services/tournamentService'
import { sessionService } from '../services/sessionService'
import type { Session } from '../services/sessionService'
import { ArrowLeft, Calendar, Trophy, CheckCircle, Crown, TrendingUp, Flag } from 'lucide-react'
import Button from '../components/Button'
import toast from 'react-hot-toast'

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  usr: number;
}

export default function CircuitPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  
  const [circuit, setCircuit] = useState<Circuit | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [standings, setStandings] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [registrations, setRegistrations] = useState<Record<string, boolean>>({})
  const [sessionCheckins, setSessionCheckins] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!id) return
    let cancelled = false
    
    Promise.all([
      getCircuit(id),
      getTournamentsByCircuit(id),
      sessionService.getSessionsByCircuit(id),
      getCircuitStandings(10)
    ]).then(async ([circRes, tourRes, sessRes, standRes]) => {
      if (cancelled) return
      setCircuit(circRes.data)
      const tData = tourRes.data || []
      setTournaments(tData)
      setSessions(sessRes.data || [])
      setStandings(standRes.data || [])
      
      // Check registrations for each tournament
      if (user) {
        const regs: Record<string, boolean> = {}
        for (const t of tData) {
          const { isRegistered } = await checkRegistration(t.id, user.id)
          regs[t.id] = isRegistered
        }
        setRegistrations(regs)

        // Check session check-ins
        const sessCheckins: Record<string, boolean> = {}
        for (const s of (sessRes.data || [])) {
           const { data: participants } = await sessionService.getParticipants(s.id)
           sessCheckins[s.id] = participants?.some(p => p.player_id === user.id) || false
        }
        setSessionCheckins(sessCheckins)
      }
      
      setLoading(false)
    })
    
    return () => { cancelled = true }
  }, [id, user])

  const handleRegister = async (tournamentId: string) => {
    if (!user) return
    const { success, error } = await registerForTournament(tournamentId, user.id)
    if (success) {
      toast.success("DEPLOYMENT REQUESTED")
      setRegistrations(prev => ({ ...prev, [tournamentId]: true }))
    } else {
      toast.error("Deployment failed: " + error?.message)
    }
  }

  const handleJoinSession = async (sessionId: string) => {
    if (!user) return
    const { success, error } = await sessionService.joinSession(sessionId, user.id)
    if (success) {
      toast.success("CHECKED INTO SESSION")
      setSessionCheckins(prev => ({ ...prev, [sessionId]: true }))
    } else {
      toast.error("Check-in failed: " + error?.message)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-nexus-400 font-mono text-sm animate-pulse">LOADING LOGISTICS...</div>
    </div>
  )
  
  if (!circuit) return (
    <div className="flex-1 flex flex-col items-center justify-center text-ink-500">
      <p className="font-mono mb-4 text-center">404: CIRCUIT ARCHIVE NOT FOUND.</p>
      <Link to="/app/tournaments">
        <Button variant="ghost"><ArrowLeft size={16} className="mr-2" /> Return to Tournaments</Button>
      </Link>
    </div>
  )

  const topThree = standings.slice(0, 3)
  const restUsers = standings.slice(3)

  return (
    <div className="flex-1 w-full bg-steel-950 overflow-y-auto custom-scrollbar pb-20">
      {/* Hero Header */}
      <div className="relative h-64 lg:h-96 w-full border-b border-steel-800">
        <div className="absolute inset-0 bg-steel-900">
          {circuit.background_url && (
            <img src={circuit.background_url} alt="bg" className="w-full h-full object-cover opacity-40 grayscale hover:grayscale-0 transition-all duration-1000" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-steel-950 via-steel-950/40 to-transparent" />
        </div>
        
        <div className="absolute inset-0 p-8 pt-12 flex flex-col justify-end max-w-7xl mx-auto">
          <Link to="/app/tournaments" className="inline-flex items-center text-nexus-500 hover:text-nexus-400 font-mono text-xs w-max mb-6 tracking-widest border border-nexus-500/30 px-3 py-1 rounded bg-nexus-500/10">
            <ArrowLeft size={14} className="mr-2" /> COMMAND CENTER / MISSIONS
          </Link>
          
          <div>
            <div className="flex items-center gap-2 mb-4">
               <Crown size={20} className="text-pulse-400 fill-pulse-400/20" />
               <span className="text-ink-400 font-mono text-xs uppercase tracking-[0.3em] font-bold">{circuit.season || 'Protocol Alpha'}</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-black text-ink-50 uppercase tracking-tighter leading-none mb-4 italic">
              {circuit.name}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm font-mono text-ink-300">
              <span className="flex items-center gap-2 bg-steel-900/80 px-3 py-1.5 rounded border border-steel-700">
                <Calendar size={16} className="text-nexus-500" /> 
                {new Date(circuit.start_date).toLocaleDateString()} — {new Date(circuit.end_date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-2 bg-steel-900/80 px-3 py-1.5 rounded border border-steel-700 uppercase tracking-widest font-bold text-nexus-400">
                <Trophy size={16} className="text-pulse-400" /> Season Operations
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Roadmap (L) and Standings (R) */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column: Circuit Roadmap */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between border-b border-steel-800 pb-4">
              <h2 className="text-xl font-display font-bold text-ink-50 uppercase tracking-widest flex items-center gap-3 italic">
                <Flag size={20} className="text-nexus-500" /> Circuit Roadmap
              </h2>
           </div>

           <div className="relative space-y-8 pl-12">
              <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-nexus-500/50 via-steel-800 to-steel-800/20 shadow-[0_0_10px_rgba(45,212,191,0.2)]"></div>
              
              {/* Combine Tournaments and Sessions for the roadmap */}
              {[...sessions, ...tournaments].length === 0 ? (
                <div className="p-12 text-center bg-steel-900/30 border border-dashed border-steel-800 rounded-xl">
                   <p className="text-ink-500 font-mono text-sm uppercase tracking-widest">No operations currently active in this sector.</p>
                </div>
              ) : (
                [...sessions, ...tournaments].sort((a,b) => {
                  const dateA = 'start_time' in a ? new Date(a.start_time ?? a.created_at).getTime() : new Date(a.created_at).getTime()
                  const dateB = 'start_time' in b ? new Date(b.start_time ?? b.created_at).getTime() : new Date(b.created_at).getTime()
                  return dateA - dateB
                }).map((op) => {
                  const isSession = 'point_scale' in op
                  const id = op.id
                  const status = op.status
                  const name = 'name' in op ? op.name : (op as any).name
                  const game = 'game' in op ? op.game : 'Unknown'

                  return (
                    <div key={id} className="relative group">
                       {/* Node */}
                       <div className={`absolute -left-[30px] top-4 w-4 h-4 rounded-full border-2 bg-steel-950 z-10 transition-all duration-300 group-hover:scale-125 ${status === 'completed' ? 'border-victory-500 bg-victory-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'border-nexus-500 shadow-[0_0_10px_rgba(45,212,191,0.5)]'}`}></div>
                       
                       <div className="bg-steel-900/50 border border-steel-800 rounded-xl p-5 hover:border-nexus-500/50 transition-all group-hover:bg-steel-900/80">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div>
                                <div className="flex items-center gap-3 mb-2">
                                   <span className="text-[10px] font-mono font-bold uppercase py-0.5 px-2 bg-steel-800 text-ink-300 rounded border border-steel-700">
                                      {isSession ? 'Tournament Session' : 'Bracket Ops'}
                                   </span>
                                   <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${status === 'active' ? 'text-pulse-400 animate-pulse' : 'text-ink-500'}`}>
                                      {status}
                                   </span>
                                </div>
                                <h3 className="text-xl font-display font-black text-ink-100 uppercase tracking-widest group-hover:text-nexus-400 transition-colors">{name}</h3>
                                <p className="text-xs font-mono text-ink-400 uppercase mt-1 tracking-wider">{game} sector</p>
                             </div>

                             <div className="flex items-center gap-3">
                                {isSession ? (
                                  status === 'active' ? (
                                    <Link to={`/app/session/${id}`}>
                                      <Button variant="primary" size="sm" className="!bg-pulse-500 !text-pulse-950 font-bold tracking-tighter">
                                        VIEW STANDINGS
                                      </Button>
                                    </Link>
                                  ) : sessionCheckins[id] ? (
                                    <Link to={`/app/session/${id}`}>
                                      <Button variant="ghost" size="sm" className="bg-steel-800 text-victory-500 border border-victory-500/20">
                                        <CheckCircle size={14} className="mr-2" /> ENTERED
                                      </Button>
                                    </Link>
                                  ) : (
                                    <Button variant="primary" size="sm" onClick={() => handleJoinSession(id)}>
                                      CHECK-IN
                                    </Button>
                                  )
                                ) : (
                                  registrations[id] ? (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-victory-900/20 text-victory-500 border border-victory-500/30 font-mono text-[10px] uppercase font-bold">
                                      <CheckCircle size={12} /> Registered
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="secondary" onClick={() => handleRegister(id)} disabled={status === 'completed'}>
                                      REGISTER
                                    </Button>
                                  )
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                  )
                })
              )}
           </div>
        </div>

        {/* Right Column: Season Standings Podium */}
        <div className="space-y-8">
           <h2 className="text-xl font-display font-bold text-ink-50 uppercase tracking-widest flex items-center gap-3 italic">
             <TrendingUp size={20} className="text-pulse-400" /> Leaderboard
           </h2>

           {/* Podium View */}
           <div className="grid grid-cols-3 gap-2 items-end mb-8 pt-10">
              {/* 2nd Place */}
              {topThree[1] && (
                 <div className="flex flex-col items-center">
                    <div className="relative group mb-2">
                       <div className="w-14 h-14 rounded-full bg-steel-800 border-2 border-ink-500/30 overflow-hidden group-hover:border-ink-500/60 transition-all">
                          {topThree[1].avatar_url ? (
                            <img src={topThree[1].avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-steel-700 text-ink-400 font-bold uppercase">{topThree[1].username[0]}</div>
                          )}
                       </div>
                       <div className="absolute -bottom-1 -right-1 bg-ink-500 text-steel-950 font-bold rounded-full w-5 h-5 flex items-center justify-center text-[10px] border-2 border-steel-950">2</div>
                    </div>
                    <div className="bg-steel-900/80 border-t border-x border-steel-700 rounded-t-xl p-3 flex flex-col items-center w-full h-24 justify-end shadow-2xl">
                       <div className="font-bold text-[10px] text-ink-100 truncate w-full text-center">{topThree[1].username}</div>
                       <div className="text-[10px] font-mono text-ink-400">{topThree[1].usr} USR</div>
                       <div className="mt-2 text-2xl font-display font-black text-ink-500/30">II</div>
                    </div>
                 </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                 <div className="flex flex-col items-center">
                    <div className="relative group mb-2 scale-110">
                       <Crown size={16} className="text-pulse-400 absolute -top-4 left-1/2 -translate-x-1/2 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                       <div className="w-18 h-18 rounded-full bg-steel-800 border-2 border-pulse-500 overflow-hidden shadow-[0_0_20px_rgba(251,113,133,0.3)] group-hover:scale-105 transition-all">
                          {topThree[0].avatar_url ? (
                            <img src={topThree[0].avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-steel-700 text-ink-400 font-bold uppercase">{topThree[0].username[0]}</div>
                          )}
                       </div>
                       <div className="absolute -bottom-1 -right-1 bg-pulse-500 text-steel-950 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs border-2 border-steel-950">1</div>
                    </div>
                    <div className="bg-gradient-to-b from-pulse-900/20 to-steel-900 border-t border-x border-pulse-500/40 rounded-t-xl p-3 flex flex-col items-center w-full h-32 justify-end shadow-2xl relative">
                       <div className="absolute inset-0 bg-pulse-500/5 blur-xl rounded-t-xl"></div>
                       <div className="font-bold text-xs text-ink-50 truncate w-full text-center relative z-10">{topThree[0].username}</div>
                       <div className="text-xs font-mono text-pulse-400 font-bold relative z-10">{topThree[0].usr} USR</div>
                       <div className="mt-2 text-3xl font-display font-black text-pulse-500/20 relative z-10">I</div>
                    </div>
                 </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                 <div className="flex flex-col items-center">
                    <div className="relative group mb-2">
                       <div className="w-14 h-14 rounded-full bg-steel-800 border-2 border-victory-800/30 overflow-hidden group-hover:border-victory-800/60 transition-all">
                          {topThree[2].avatar_url ? (
                            <img src={topThree[2].avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-steel-700 text-ink-400 font-bold uppercase">{topThree[2].username[0]}</div>
                          )}
                       </div>
                       <div className="absolute -bottom-1 -right-1 bg-victory-800 text-steel-950 font-bold rounded-full w-5 h-5 flex items-center justify-center text-[10px] border-2 border-steel-950">3</div>
                    </div>
                    <div className="bg-steel-900/80 border-t border-x border-steel-700 rounded-t-xl p-3 flex flex-col items-center w-full h-20 justify-end shadow-2xl">
                       <div className="font-bold text-[10px] text-ink-100 truncate w-full text-center">{topThree[2].username}</div>
                       <div className="text-[10px] font-mono text-ink-400">{topThree[2].usr} USR</div>
                       <div className="mt-2 text-2xl font-display font-black text-victory-900/30">III</div>
                    </div>
                 </div>
              )}
           </div>

           {/* Table List for others */}
           <div className="bg-steel-900/50 border border-steel-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-4 bg-steel-900/80 border-b border-steel-800 flex justify-between text-[10px] font-mono font-bold text-ink-500 uppercase tracking-widest">
                 <span>Operator</span>
                 <span>USR Rating</span>
              </div>
              <div className="divide-y divide-steel-800">
                 {restUsers?.length > 0 ? restUsers.map((u, i) => (
                    <div key={u.id} className="p-4 flex items-center justify-between hover:bg-steel-800/50 transition-colors group">
                       <div className="flex items-center gap-4">
                          <span className="text-ink-500 font-mono text-[10px] w-4">{i + 4}</span>
                          <div className="w-8 h-8 rounded-full bg-steel-800 border border-steel-700 overflow-hidden group-hover:border-nexus-500 transition-colors">
                             {u.avatar_url ? (
                               <img src={u.avatar_url} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-ink-400 text-[10px] uppercase">{u.username[0]}</div>
                             )}
                          </div>
                          <span className="text-sm font-medium text-ink-200 group-hover:text-ink-50 transition-colors">{u.username || 'Unknown Operator'}</span>
                       </div>
                       <span className="font-mono text-sm font-bold text-nexus-400">{u.usr || 0}</span>
                    </div>
                 )) : <div className="p-8 text-center text-xs font-mono text-ink-500 uppercase tracking-widest">Awaiting engagement data...</div>}
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
