import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { createCircuit, updateCircuitStatus, deleteCircuit } from '../services/circuitService'
import { createTournament } from '../services/tournamentService'
import { sessionService } from '../services/sessionService'
import Button from '../components/Button'
import { supabase } from '../services/supabase'
import { Play, Clock, Info, ShieldAlert, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Admin() {
  const { profile } = useAuth()
  
  const [circuits, setCircuits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create Circuit State
  const [circuitName, setCircuitName] = useState('')
  const [circuitSeason, setCircuitSeason] = useState('2026')
  const [circuitStart, setCircuitStart] = useState('')
  const [circuitEnd, setCircuitEnd] = useState('')
  const [circuitDesc, setCircuitDesc] = useState('')
  const [isManual, setIsManual] = useState(false)
  const [creatingCircuit, setCreatingCircuit] = useState(false)
  
  // Create Tournament State
  const [tName, setTName] = useState('')
  const [tCircuitId, setTCircuitId] = useState('')
  const [tGame, setTGame] = useState('')
  const [tFormat, setTFormat] = useState('single_elimination')
  const [tEntryType, setTEntryType] = useState('1v1')
  const [tBestOf, setTBestOf] = useState(1)
  const [tStartTime, setTStartTime] = useState('')
  const [tIsManual, setTIsManual] = useState(false)
  const [creatingT, setCreatingT] = useState(false)

  // Create Session State
  const [sName, setSName] = useState('')
  const [sGame, setSGame] = useState('')
  const [sMaxGames, setSMaxGames] = useState(7)
  const [sCircuitId, setSCircuitId] = useState('')
  const [creatingS, setCreatingS] = useState(false)

  // Active Weekly Challenge State
  const [challengeGame, setChallengeGame] = useState('')
  const [challengeTarget, setChallengeTarget] = useState('')
  const [challengeGenre, setChallengeGenre] = useState('Racing')
  const [challengeDesc, setChallengeDesc] = useState('')
  const [challengeTimeMin, setChallengeTimeMin] = useState('')
  const [challengeTimeSec, setChallengeTimeSec] = useState('')
  const [challengeTimeMs, setChallengeTimeMs] = useState('')
  const [challengeTargetValue, setChallengeTargetValue] = useState('')
  const [updatingChallenge, setUpdatingChallenge] = useState(false)

  useEffect(() => {
    fetchCircuits()
    fetchActiveChallenge()
  }, [])

  const fetchActiveChallenge = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'active_weekly_challenge')
      .single()
    if (data && data.value) {
      setChallengeGame(data.value.game || '')
      setChallengeTarget(data.value.target || '')
      setChallengeGenre(data.value.genre || 'Racing')
      setChallengeDesc(data.value.description || '')
      
      if (data.value.genre === 'Racing' && data.value.target_time) {
        const totalSecs = parseFloat(data.value.target_time) || 0;
        const mins = Math.floor(totalSecs / 60);
        const secs = Math.floor(totalSecs % 60);
        const ms = Math.round((totalSecs % 1) * 1000);
        setChallengeTimeMin(mins > 0 ? String(mins) : '')
        setChallengeTimeSec(secs > 0 ? String(secs) : '')
        setChallengeTimeMs(ms > 0 ? String(ms) : '')
      } else {
        setChallengeTargetValue(data.value.target_value || '')
      }
    }
  }

  const fetchCircuits = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('circuits')
      .select('*')
      .order('created_at', { ascending: false })
    setCircuits(data || [])
    setLoading(false)
  }

  const handleStartCircuit = async (id: string) => {
    const { success } = await updateCircuitStatus(id, 'active')
    if (success) {
      toast.success("CIRCUIT DEPLOYED")
      fetchCircuits()
    } else {
      toast.error("DEPLOYMENT FAILED")
    }
  }

  const handleDeleteCircuit = async (id: string) => {
    if (!window.confirm("Are you sure you want to terminate this Circuit? This action is permanent.")) return;
    const { success, error } = await deleteCircuit(id);
    if (success) {
      toast.success("CIRCUIT TERMINATED");
      fetchCircuits();
    } else {
      toast.error("TERMINATION FAILED: " + error?.message);
    }
  }

  if (!profile?.is_admin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-threat-900/10 border border-threat-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] rounded p-8 text-center rounded-xl max-w-md">
          <ShieldAlert size={48} className="text-threat-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black font-display tracking-widest text-threat-500 uppercase mb-4">Classified Error 403</h2>
          <p className="text-ink-300 font-mono text-sm leading-relaxed">
            Your clearance level is insufficient for Command Operations. Access logged and denied.
          </p>
        </div>
      </div>
    )
  }

  const handleCreateCircuit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingCircuit(true)
    const res = await createCircuit({
      name: circuitName,
      season: circuitSeason,
      start_date: circuitStart,
      end_date: circuitEnd,
      description: circuitDesc,
      is_manual: isManual,
      status: 'upcoming'
    })
    setCreatingCircuit(false)
    if (res.success) {
      toast.success("CIRCUIT ESTABLISHED")
      setCircuitName('')
      setCircuitSeason('2026')
      setCircuitDesc('')
      setCircuitStart('')
      setCircuitEnd('')
      setIsManual(false)
      fetchCircuits()
    } else {
      toast.error("ESTABLISHMENT FAILED: " + res.error?.message)
    }
  }

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingT(true)
    const { success, error } = await createTournament({
      circuit_id: tCircuitId || null,
      name: tName,
      game: tGame,
      format: tFormat as any,
      entry_type: tEntryType as any,
      best_of: tBestOf,
      start_time: tIsManual ? null : tStartTime,
      status: 'upcoming'
    })
    setCreatingT(false)
    if (success) {
      toast.success("TOURNAMENT ESTABLISHED")
      setTName('')
      setTGame('')
      setTCircuitId('')
      setTStartTime('')
    } else {
      toast.error("ESTABLISHMENT FAILED: " + error?.message)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingS(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { success, error } = await sessionService.createSession({
      name: sName,
      game: sGame,
      max_games: sMaxGames,
      circuit_id: sCircuitId || null,
      creator_id: user.id,
      status: 'pending'
    })
    
    setCreatingS(false)
    if (success) {
      toast.success("SESSION INITIALIZED")
      setSName('')
      setSGame('')
      fetchCircuits() // Refresh control list
    } else {
      toast.error("Failed to initialize: " + error?.message)
    }
  }

  const handleUpdateChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingChallenge(true)

    let targetTime: number | null = null;
    if (challengeGenre === 'Racing') {
      const min = parseFloat(challengeTimeMin) || 0;
      const sec = parseFloat(challengeTimeSec) || 0;
      const ms = parseFloat(challengeTimeMs) || 0;
      targetTime = min * 60 + sec + ms / 1000;
    }

    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'active_weekly_challenge',
        value: {
          game: challengeGame,
          target: challengeTarget,
          genre: challengeGenre,
          description: challengeDesc,
          target_time: targetTime,
          target_value: challengeGenre !== 'Racing' ? challengeTargetValue : null
        }
      })
    setUpdatingChallenge(false)
    if (error) {
      toast.error("Failed to update challenge: " + error.message)
    } else {
      toast.success("ACTIVE WEEKLY CHALLENGE SET!")
    }
  }

  return (
    <div className="flex-1 w-full p-4 lg:p-8 space-y-8 max-w-6xl mx-auto overflow-y-auto custom-scrollbar">
      <div>
        <h1 className="text-3xl font-display font-black text-ink-50 uppercase tracking-[0.2em] mb-1">Command Operations</h1>
        <p className="text-ink-400 text-xs font-mono uppercase tracking-widest">Administrative Grid & Structure Management.</p>
      </div>
      
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Creation Forms Column */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Create Circuit Form */}
            <div className="bg-steel-900 border border-steel-700/50 rounded-lg p-6 shadow-xl">
              <h2 className="text-sm font-bold font-display uppercase tracking-widest text-nexus-400 mb-6 border-b border-steel-800 pb-4">
                Establish new Circuit
              </h2>
              <form className="space-y-4" onSubmit={handleCreateCircuit}>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Circuit Title</label>
                  <input required type="text" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={circuitName} onChange={e=>setCircuitName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Season Identifier</label>
                  <input required type="text" placeholder="e.g. 2026 S1" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={circuitSeason} onChange={e=>setCircuitSeason(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Start Date</label>
                    <input required type="date" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={circuitStart} onChange={e=>setCircuitStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">End Date</label>
                    <input required type="date" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={circuitEnd} onChange={e=>setCircuitEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Description</label>
                  <textarea className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm h-24" value={circuitDesc} onChange={e=>setCircuitDesc(e.target.value)} />
                </div>
                <div className="flex items-center gap-3 bg-steel-950/50 p-3 rounded border border-steel-800">
                  <input 
                    type="checkbox" 
                    id="manual-start"
                    checked={isManual}
                    onChange={e => setIsManual(e.target.checked)}
                    className="w-4 h-4 rounded border-steel-700 bg-steel-900 text-nexus-500 focus:ring-nexus-500"
                  />
                  <label htmlFor="manual-start" className="text-[10px] font-mono uppercase tracking-widest text-ink-300 flex items-center gap-2 cursor-pointer">
                    Manual Deployment Mode <Info size={12} className="text-ink-500" />
                  </label>
                </div>
                <Button type="submit" variant="primary" className="w-full" disabled={creatingCircuit}>
                  {creatingCircuit ? 'Deploying...' : 'Deploy Circuit'}
                </Button>
              </form>
            </div>

            <div className="bg-steel-900 border border-steel-700/50 rounded-lg p-6 shadow-xl">
              <h2 className="text-sm font-bold font-display uppercase tracking-widest text-nexus-400 mb-6 border-b border-steel-800 pb-4">
                Schedule Tournament
              </h2>
              <form className="space-y-4" onSubmit={handleCreateTournament}>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Title</label>
                  <input required type="text" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={tName} onChange={e=>setTName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Game / Subject</label>
                  <input required type="text" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={tGame} onChange={e=>setTGame(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Format</label>
                    <select className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={tFormat} onChange={e=>setTFormat(e.target.value)}>
                      <option value="single_elimination">Single Elimination</option>
                      <option value="double_elimination">Double Elimination</option>
                      <option value="round_robin">Round Robin / League</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Entry Type</label>
                    <select className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={tEntryType} onChange={e=>setTEntryType(e.target.value)}>
                      <option value="1v1">1v1 Solo</option>
                      <option value="team">Team Entry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Best Of</label>
                    <select className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={tBestOf} onChange={e=>setTBestOf(parseInt(e.target.value))}>
                      <option value={1}>1 (Single Match)</option>
                      <option value={3}>3 (Bo3)</option>
                      <option value={5}>5 (Bo5)</option>
                      <option value={7}>7 (Bo7)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Parent Circuit (Optional)</label>
                  <select className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={tCircuitId} onChange={e=>setTCircuitId(e.target.value)}>
                    <option value="">Stand-alone Operation</option>
                    {circuits.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {!tIsManual && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Scheduled Start Time</label>
                    <input required type="datetime-local" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={tStartTime} onChange={e=>setTStartTime(e.target.value)} />
                  </div>
                )}
                <div className="flex items-center gap-3 bg-steel-950/50 p-3 rounded border border-steel-800">
                  <input 
                    type="checkbox" 
                    id="t-manual-start"
                    checked={tIsManual}
                    onChange={e => setTIsManual(e.target.checked)}
                    className="w-4 h-4 rounded border-steel-700 bg-steel-900 text-nexus-500 focus:ring-nexus-500"
                  />
                  <label htmlFor="t-manual-start" className="text-[10px] font-mono uppercase tracking-widest text-ink-300 flex items-center gap-2 cursor-pointer">
                    Manual Start Mode <Clock size={12} className="text-ink-500" />
                  </label>
                </div>
                <Button type="submit" variant="primary" className="w-full" disabled={creatingT}>
                  {creatingT ? 'Establishing...' : 'Establish Tournament'}
                </Button>
              </form>
            </div>

            {/* Create Session Form */}
            <div className="bg-steel-900 border border-steel-700/50 rounded-lg p-6 shadow-xl">
              <h2 className="text-sm font-bold font-display uppercase tracking-widest text-pulse-400 mb-6 border-b border-steel-800 pb-4">
                Initiate Grand Prix Session
              </h2>
              <form className="space-y-4" onSubmit={handleCreateSession}>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Parent Circuit (Optional)</label>
                  <select className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={sCircuitId} onChange={e=>setSCircuitId(e.target.value)}>
                    <option value="">Stand-alone Session</option>
                    {circuits.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Session Name</label>
                  <input required type="text" placeholder="e.g. Friday Night CoD" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={sName} onChange={e=>setSName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Game</label>
                    <input required type="text" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={sGame} onChange={e=>setSGame(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Series Length</label>
                    <input required type="number" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={sMaxGames} onChange={e=>setSMaxGames(parseInt(e.target.value))} />
                  </div>
                </div>
                <Button type="submit" variant="primary" className="w-full !bg-pulse-500 !text-pulse-950 hover:!bg-pulse-400" disabled={creatingS}>
                  {creatingS ? 'Initializing...' : 'Initialize Session'}
                </Button>
              </form>
            </div>

            {/* Active Weekly Challenge Form */}
            <div className="bg-steel-900 border border-steel-700/50 rounded-lg p-6 shadow-xl">
              <h2 className="text-sm font-bold font-display uppercase tracking-widest text-victory-400 mb-6 border-b border-steel-800 pb-4">
                Set Active Weekly Challenge
              </h2>
              <form className="space-y-4" onSubmit={handleUpdateChallenge}>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Game / Title</label>
                  <input required type="text" placeholder="e.g. Forza Horizon 6, Pickle Pete" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={challengeGame} onChange={e=>setChallengeGame(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Genre</label>
                    <select className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={challengeGenre} onChange={e=>setChallengeGenre(e.target.value)}>
                      <option value="Racing">Racing</option>
                      <option value="Shooter">Shooter</option>
                      <option value="Battle Royale">Battle Royale</option>
                      <option value="Puzzle">Puzzle</option>
                      <option value="Fighter">Fighter</option>
                    </select>
                  </div>
                  {challengeGenre === 'Racing' ? (
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Track Name / Target</label>
                      <input required type="text" placeholder="e.g. Maple Valley" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={challengeTarget} onChange={e=>setChallengeTarget(e.target.value)} />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Target Stat (e.g. Score, Kills)</label>
                      <input required type="text" placeholder="e.g. High Score, Kills" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={challengeTarget} onChange={e=>setChallengeTarget(e.target.value)} />
                    </div>
                  )}
                </div>

                {challengeGenre === 'Racing' ? (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Target Lap/Race Time (Min : Sec . Ms)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="MM" className="bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm text-center" value={challengeTimeMin} onChange={e=>setChallengeTimeMin(e.target.value)} />
                      <input type="number" placeholder="SS" className="bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm text-center" value={challengeTimeSec} onChange={e=>setChallengeTimeSec(e.target.value)} />
                      <input type="number" placeholder="mmm" className="bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm text-center" value={challengeTimeMs} onChange={e=>setChallengeTimeMs(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Target Value (Number)</label>
                    <input type="number" placeholder="e.g. 100000" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm" value={challengeTargetValue} onChange={e=>setChallengeTargetValue(e.target.value)} />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-1">Description / Instructions</label>
                  <textarea placeholder="e.g. Post your fastest lap time or highest score to claim the weekly crown!" className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm h-20" value={challengeDesc} onChange={e=>setChallengeDesc(e.target.value)} />
                </div>
                <Button type="submit" variant="primary" className="w-full !bg-victory-500 !text-victory-950 hover:!bg-victory-400" disabled={updatingChallenge}>
                  {updatingChallenge ? 'Updating Settings...' : 'Update Challenge'}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Management Column */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <div className="bg-steel-900 border border-steel-700 rounded-lg p-6 shadow-2xl h-full">
            <h2 className="text-sm font-bold font-display uppercase tracking-widest text-ink-100 mb-6 flex items-center gap-3">
              <Clock size={16} className="text-nexus-400" /> Deployment Control
            </h2>
            
            <div className="space-y-3">
              {loading ? (
                <div className="text-[10px] text-ink-500 font-mono animate-pulse">SYNCHRONIZING WITH GRID...</div>
              ) : circuits.length === 0 ? (
                <div className="text-[10px] text-ink-600 font-mono italic">No active operations found.</div>
              ) : circuits.map(c => (
                <div key={c.id} className="bg-steel-950 border border-steel-800 p-4 rounded-lg flex items-center justify-between group hover:border-nexus-500/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-victory-500 animate-pulse' : 'bg-ink-700'}`} />
                      <h3 className="text-xs font-black text-ink-100 truncate uppercase">{c.name}</h3>
                    </div>
                    <div className="flex gap-3 text-[9px] font-mono text-ink-500 uppercase">
                      <span>{c.status}</span>
                      {c.is_manual && <span className="text-nexus-400 px-1 bg-nexus-900/20 border border-nexus-900">MANUAL</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {c.status === 'upcoming' && (
                      <button 
                        onClick={() => handleStartCircuit(c.id)}
                        className="bg-victory-900/20 hover:bg-victory-900/40 text-victory-500 border border-victory-500/30 px-3 py-1.5 rounded text-[10px] font-black uppercase flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Play size={10} fill="currentColor" /> Start Now
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteCircuit(c.id)}
                      className="bg-threat-900/20 hover:bg-threat-900/45 text-threat-500 border border-threat-500/30 p-1.5 rounded transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      title="Terminate Operation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}
