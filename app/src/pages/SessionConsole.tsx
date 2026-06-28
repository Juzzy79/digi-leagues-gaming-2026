import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionService } from '../services/sessionService'
import type { Session, SessionParticipant } from '../services/sessionService'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import { Trophy, Play, CheckCircle2, AlertTriangle, Shield, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { supabase } from '../services/supabase'

export default function SessionConsole() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [loading, setLoading] = useState(true)
  
  // Reporting State
  const [currentPlacements, setCurrentPlacements] = useState<Record<string, number>>({}) // playerId -> rank
  const [submitting, setSubmitting] = useState(false)

  // Edit Configuration States
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMaxGames, setEditMaxGames] = useState(7)

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    if (!id) return
    setLoading(true)
    const [sRes, pRes] = await Promise.all([
      sessionService.getSession(id),
      sessionService.getParticipants(id)
    ])
    
    if (sRes.data) setSession(sRes.data as any)
    if (pRes.data) setParticipants(pRes.data)
    setLoading(false)
  }

  const handleSetRank = (playerId: string, rank: number) => {
    // If this rank is already assigned to someone else, clear it from them
    const updated = { ...currentPlacements }
    Object.keys(updated).forEach(id => {
      if (updated[id] === rank) delete updated[id]
    })
    
    // Assign rank to current player
    updated[playerId] = rank
    setCurrentPlacements(updated)
  }

  const submitGame = async () => {
    if (!session || !id) return
    if (Object.keys(currentPlacements).length < 3 && participants.length >= 3) {
      toast.error("PLEASE ASSIGN 1ST, 2ND, AND 3RD")
      return
    }

    setSubmitting(true)
    const gameNum = (session.current_game || 0) + 1
    const res = await sessionService.recordGameResult(id, gameNum, currentPlacements)
    
    if (res.success) {
      toast.success(`GAME ${gameNum} LOGGED`)
      setCurrentPlacements({})
      loadData()
    } else {
      toast.error("FAILED TO LOG GAME")
    }
    setSubmitting(false)
  }

  const finalizeSession = async () => {
    if (!window.confirm("FINALISE SESSION? This will lock results and update global standings.")) return
    if (!id) return
    
    setSubmitting(true)
    const res = await sessionService.finalizeSession(id)
    if (res.success) {
      toast.success("SESSION COMPLETE - STANDINGS UPDATED")
      navigate(`/app/tournaments`)
    } else {
      toast.error("FAILED TO FINALISE")
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-nexus-400 font-mono text-sm animate-pulse">SYNCING SESSION DATA...</div>
    </div>
  )

  if (!session) return <div>Session not found</div>

  const isCreator = profile?.id === session.creator_id || profile?.is_admin

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden bg-steel-950">
      {/* LEFT: Reporter Console */}
      <div className="flex-1 flex flex-col p-4 lg:p-8 space-y-6 overflow-y-auto custom-scrollbar border-r border-steel-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-nexus-500 font-mono text-[10px] uppercase tracking-[0.2em] mb-1">
              <Play size={12} fill="currentColor" /> Live Grand Prix Session
            </div>
            <h1 className="text-3xl font-display font-black text-ink-50 uppercase tracking-widest">{session.name}</h1>
            <p className="text-ink-400 font-mono text-sm mt-1">{session.game} • Game {session.current_game} of {session.max_games}</p>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] font-mono text-ink-500 uppercase tracking-widest mb-1">Session Status</div>
            <div className={clsx(
              "px-3 py-1 rounded border font-mono text-xs font-bold uppercase",
              session.status === 'active' ? "bg-victory-900/20 text-victory-500 border-victory-500/30 animate-pulse" : "bg-steel-800 text-ink-300 border-steel-700"
            )}>
              {session.status}
            </div>
          </div>
        </div>

        {isCreator ? (
          <div className="bg-steel-900 border border-steel-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-steel-800 bg-steel-950/50 flex items-center justify-between">
              <h2 className="text-sm font-display font-bold uppercase tracking-widest text-ink-100 flex items-center gap-2">
                <Shield size={16} className="text-nexus-400" /> Reporter Console
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => {
                  setIsEditing(!isEditing);
                  setEditName(session.name);
                  setEditMaxGames(session.max_games);
                }}>
                  {isEditing ? 'Cancel Edit' : 'Edit Settings'}
                </Button>
                {session.status === 'completed' && (
                  <Button size="sm" variant="danger" className="h-6 px-2 text-[10px] !bg-victory-900/20 !text-victory-500 hover:!bg-victory-500 hover:!text-steel-950" onClick={async () => {
                    const { error } = await supabase.from('sessions').update({ status: 'active' }).eq('id', session.id);
                    if (error) {
                      toast.error("Failed to reopen");
                    } else {
                      toast.success("Session Reopened!");
                      loadData();
                    }
                  }}>
                    Reopen Session
                  </Button>
                )}
              </div>
            </div>
            
            {isEditing ? (
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500">Session Name</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-ink-500">Max Games / Tracks</label>
                  <input 
                    type="number" 
                    value={editMaxGames} 
                    onChange={e => setEditMaxGames(parseInt(e.target.value) || 0)} 
                    className="w-full bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm"
                  />
                </div>
                <Button variant="primary" className="w-full" onClick={async () => {
                  const { error } = await supabase.from('sessions').update({ name: editName, max_games: editMaxGames }).eq('id', session.id);
                  if (error) {
                    toast.error("Failed to save changes");
                  } else {
                    toast.success("Settings updated");
                    setIsEditing(false);
                    loadData();
                  }
                }}>
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid gap-4">
                  {participants.map(p => (
                    <div key={p.player_id} className="flex items-center justify-between p-3 bg-steel-950/50 rounded-lg border border-steel-800 group hover:border-steel-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-steel-800 border border-steel-700 overflow-hidden">
                          {p.profiles?.avatar_url && <img src={p.profiles.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <div className="font-display font-bold text-ink-100 uppercase tracking-wider">{p.profiles?.username}</div>
                          <div className="font-mono text-[10px] text-pulse-400">{p.total_points} PTS TOTAL</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {[1, 2, 3].map(rank => (
                          <button
                            key={rank}
                            onClick={() => handleSetRank(p.player_id, rank)}
                            className={clsx(
                              "w-10 h-10 rounded border font-display font-black text-xs transition-all transform active:scale-95",
                              currentPlacements[p.player_id] === rank
                                ? rank === 1 ? "bg-rank-gold text-steel-950 border-rank-gold shadow-[0_0_15px_rgba(255,184,48,0.4)]"
                                  : rank === 2 ? "bg-rank-silver text-steel-950 border-rank-silver shadow-[0_0_15px_rgba(168,184,204,0.4)]"
                                  : "bg-rank-bronze text-steel-950 border-rank-bronze shadow-[0_0_15px_rgba(205,127,50,0.4)]"
                                : "bg-steel-900 text-ink-500 border-steel-700 hover:border-nexus-500"
                            )}
                          >
                            {rank}{rank === 1 ? 'ST' : rank === 2 ? 'ND' : 'RD'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-steel-800 flex flex-col sm:flex-row gap-4">
                  {session.status !== 'completed' ? (
                    <>
                      <Button 
                        variant="primary" 
                        className="flex-1 h-14 text-lg"
                        onClick={submitGame}
                        disabled={submitting}
                      >
                        {submitting ? "RECORDING..." : `LOG GAME ${session.current_game + 1} RESULTS`}
                      </Button>
                      {session.current_game >= session.max_games && (
                        <Button 
                          variant="danger" 
                          className="h-14 px-8"
                          onClick={finalizeSession}
                          disabled={submitting}
                        >
                          <CheckCircle2 size={20} className="mr-2" /> FINALISE
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="w-full text-center py-4 bg-steel-950/40 rounded border border-steel-800 font-mono text-xs text-ink-500">
                      SESSION COMPLETED. UNLOCK BY CLICKING "REOPEN SESSION" ABOVE.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-threat-900/10 border border-threat-500/30 p-8 rounded-xl text-center">
            {participants.some(p => p.player_id === profile?.id) ? (
              <>
                <CheckCircle2 size={48} className="text-victory-500 mx-auto mb-4" />
                <h3 className="text-2xl font-display font-black uppercase tracking-widest text-victory-500">You Are Deployed</h3>
                <p className="text-ink-400 font-mono text-sm mt-2 max-w-sm mx-auto mb-6">
                  You are registered for this session. Awaiting results transmission from the creator ({session.creator_id}).
                </p>
              </>
            ) : (
              <>
                <AlertTriangle size={48} className="text-threat-500 mx-auto mb-4" />
                <h3 className="text-2xl font-display font-black uppercase tracking-widest text-threat-500">Observer Mode</h3>
                <p className="text-ink-400 font-mono text-sm mt-2 max-w-sm mx-auto mb-8">
                  You are not registered for this Grand Prix Session. Join now to enter the standings!
                </p>
                <Button 
                  variant="primary" 
                  className="px-8 py-4 text-lg font-black italic tracking-widest bg-nexus-500 text-steel-950 hover:bg-nexus-400 w-full sm:w-auto"
                  onClick={async () => {
                    if (!profile?.id || !id) return;
                    setSubmitting(true);
                    const { success } = await sessionService.joinSession(id, profile.id);
                    if (success) {
                      toast.success("SUCCESSFULLY JOINED SESSION");
                      loadData();
                    } else {
                      toast.error("Failed to join session.");
                    }
                    setSubmitting(false);
                  }}
                  disabled={submitting}
                >
                  {submitting ? 'ENROLLING...' : 'JOIN SESSION'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Live Standings */}
      <div className="w-full lg:w-96 bg-steel-900/50 flex flex-col p-4 lg:p-8 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="text-nexus-500" size={24} />
          <h2 className="text-xl font-display font-black text-ink-50 uppercase tracking-widest">Live Standings</h2>
        </div>

        <div className="space-y-3">
          {participants.map((p, index) => (
            <div key={p.player_id} className={clsx(
              "relative flex items-center justify-between p-4 rounded-lg border transition-all",
              index === 0 ? "bg-nexus-900/20 border-nexus-500/50" : "bg-steel-950/30 border-steel-800"
            )}>
              <div className="flex items-center gap-4">
                <div className={clsx(
                  "font-mono text-xl font-black w-8 text-center",
                  index === 0 ? "text-rank-gold" : index === 1 ? "text-rank-silver" : index === 2 ? "text-rank-bronze" : "text-ink-700"
                )}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-display font-bold text-ink-100 uppercase tracking-wider text-sm">{p.profiles?.username}</div>
                  <div className="font-mono text-[10px] text-ink-500 uppercase tracking-tighter">Current Rank: {index + 1}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-mono text-lg font-black text-pulse-400 leading-none">{p.total_points}</div>
                <div className="text-[8px] font-mono text-ink-500 uppercase">Points</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-steel-950/50 rounded-lg border border-steel-800 border-dashed">
          <div className="text-[10px] font-mono text-ink-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Info size={12} /> Point Distribution
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-steel-900 p-2 rounded text-center">
              <div className="text-rank-gold font-mono font-bold">10</div>
              <div className="text-[8px] text-ink-500 uppercase">1st</div>
            </div>
            <div className="bg-steel-900 p-2 rounded text-center">
              <div className="text-rank-silver font-mono font-bold">5</div>
              <div className="text-[8px] text-ink-500 uppercase">2nd</div>
            </div>
            <div className="bg-steel-900 p-2 rounded text-center">
              <div className="text-rank-bronze font-mono font-bold">2</div>
              <div className="text-[8px] text-ink-500 uppercase">3rd</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
