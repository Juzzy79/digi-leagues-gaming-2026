import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import { Shield, Plus, Users, UserPlus, LogOut, Loader2, ArrowLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export default function Teams() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [crews, setCrews] = useState<any[]>([])
  const [myCrewIds, setMyCrewIds] = useState<Set<string>>(new Set())
  const [selectedCrew, setSelectedCrew] = useState<any | null>(null)
  
  // Create state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTag, setNewTag] = useState('')
  const [creating, setCreating] = useState(false)

  // Roster state
  const [roster, setRoster] = useState<any[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch all crews
      const { data: cData, error: cErr } = await supabase
        .from('crews')
        .select('*')
        .order('created_at', { ascending: false })
      if (cErr) throw cErr
      setCrews(cData || [])

      // Fetch user's memberships
      if (user) {
        const { data: mData } = await supabase
          .from('crew_members')
          .select('crew_id')
          .eq('user_id', user.id)
        
        if (mData) {
          setMyCrewIds(new Set(mData.map(m => m.crew_id)))
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newName.trim() || !newTag.trim()) return
    setCreating(true)
    try {
      // Insert crew
      const { data: crewData, error: insertErr } = await supabase
        .from('crews')
        .insert({
          name: newName.trim(),
          tag: newTag.trim().toUpperCase(),
          owner_id: user.id
        })
        .select()
        .single()
      
      if (insertErr) {
        if (insertErr.code === '23505') alert('A team with this tag already exists.')
        else alert('Failed to create team.')
        throw insertErr
      }

      // Automatically join the crew as owner
      await supabase.from('crew_members').insert({
        crew_id: crewData.id,
        user_id: user.id
      })

      setShowCreate(false)
      setNewName('')
      setNewTag('')
      await fetchData()
      handleViewTeam(crewData)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  async function handleViewTeam(crew: any) {
    setSelectedCrew(crew)
    setLoadingRoster(true)
    setRoster([])
    try {
      // Fetch members joined with profiles
      const { data, error } = await supabase
        .from('crew_members')
        .select(`
          joined_at,
          user_id,
          profiles!inner(id, username, avatar_url, usr)
        `)
        .eq('crew_id', crew.id)
        .order('joined_at', { ascending: true })

      if (error) throw error
      setRoster(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRoster(false)
    }
  }

  async function handleJoin(crewId: string) {
    if (!user) return
    try {
      await supabase.from('crew_members').insert({
        crew_id: crewId,
        user_id: user.id
      })
      setMyCrewIds(prev => new Set(prev).add(crewId))
      if (selectedCrew?.id === crewId) {
        handleViewTeam(selectedCrew) // refresh roster
      }
    } catch (err) {
      console.error(err)
      alert("Failed to join team.")
    }
  }

  async function handleLeave(crewId: string) {
    if (!user) return
    if (!confirm("Are you sure you want to leave this team?")) return
    try {
      await supabase.from('crew_members').delete()
        .eq('crew_id', crewId)
        .eq('user_id', user.id)
      
      setMyCrewIds(prev => {
        const next = new Set(prev)
        next.delete(crewId)
        return next
      })
      if (selectedCrew?.id === crewId) {
        handleViewTeam(selectedCrew)
      }
    } catch (err) {
      console.error(err)
      alert("Failed to leave team.")
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-nexus-500" />
      </div>
    )
  }

  if (selectedCrew) {
    const isMember = myCrewIds.has(selectedCrew.id)
    const isOwner = selectedCrew.owner_id === user?.id

    return (
      <div className="flex-1 overflow-auto bg-steel-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <button 
            onClick={() => setSelectedCrew(null)}
            className="flex items-center gap-2 text-ink-400 hover:text-ink-100 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Teams
          </button>

          <div className="bg-steel-900 border border-steel-800 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-display font-black text-ink-100 uppercase tracking-widest">
                  [{selectedCrew.tag}] {selectedCrew.name}
                </h1>
                <p className="text-sm font-mono text-ink-500 mt-2">
                  Established {new Date(selectedCrew.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3">
                {isMember ? (
                  <button 
                    onClick={() => handleLeave(selectedCrew.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-threat-500/10 text-threat-500 border border-threat-500/30 hover:bg-threat-500 hover:text-white transition-colors rounded font-bold text-sm"
                  >
                    <LogOut size={16} /> LEAVE
                  </button>
                ) : (
                  <button 
                    onClick={() => handleJoin(selectedCrew.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-nexus-500 text-white hover:bg-nexus-400 transition-colors rounded font-bold text-sm shadow-[0_0_15px_rgba(0,188,212,0.3)]"
                  >
                    <UserPlus size={16} /> JOIN TEAM
                  </button>
                )}
              </div>
            </div>

            <h2 className="text-sm font-mono text-nexus-400 uppercase tracking-widest mb-4">Official Roster</h2>
            
            {loadingRoster ? (
              <div className="flex items-center gap-2 text-ink-400 py-4">
                <Loader2 size={16} className="animate-spin" /> Fetching operators...
              </div>
            ) : roster.length === 0 ? (
              <div className="text-ink-500 italic py-4">No active operators in this team.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roster.map(member => (
                  <div key={member.user_id} className="flex items-center gap-4 bg-steel-950 p-3 rounded border border-steel-800">
                    {member.profiles.avatar_url ? (
                      <img src={member.profiles.avatar_url} className="w-10 h-10 rounded border border-steel-700 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-steel-800 flex items-center justify-center border border-steel-700">
                        <Users size={16} className="text-ink-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-100">{member.profiles.username}</span>
                        {member.user_id === selectedCrew.owner_id && (
                          <Shield size={12} className="text-circuit-500" title="Team Captain" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-pulse-400">
                        {member.profiles.usr} USR
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-steel-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-ink-100 tracking-widest uppercase">
              TEAMS & CREWS
            </h1>
            <p className="text-sm text-ink-400 font-mono mt-1">
              Join forces, build rosters, and prepare for team tournaments.
            </p>
          </div>
          
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-6 py-2.5 bg-nexus-500 hover:bg-nexus-400 text-white font-bold tracking-wider rounded transition-all shadow-[0_0_15px_rgba(0,188,212,0.3)]"
          >
            <Plus size={18} /> REGISTER TEAM
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-steel-900 border border-steel-700 p-6 rounded-lg animate-in fade-in slide-in-from-top-4">
            <h2 className="text-nexus-400 font-mono text-sm tracking-widest uppercase mb-4">Register New Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-ink-400 tracking-widest uppercase">Team Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Optic Gaming"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-steel-950 border border-steel-700 p-3 text-ink-100 focus:border-nexus-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-ink-400 tracking-widest uppercase">Team Tag (3-4 Chars)</label>
                <input 
                  type="text"
                  required
                  maxLength={4}
                  placeholder="e.g. OPT"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  className="w-full bg-steel-950 border border-steel-700 p-3 text-ink-100 focus:border-nexus-500 focus:outline-none uppercase"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-ink-400 hover:text-ink-100 font-bold transition-colors"
              >
                CANCEL
              </button>
              <button 
                type="submit" 
                disabled={creating}
                className="px-6 py-2 bg-nexus-500 hover:bg-nexus-400 disabled:opacity-50 text-white font-bold rounded transition-colors"
              >
                {creating ? 'REGISTERING...' : 'CONFIRM REGISTRATION'}
              </button>
            </div>
          </form>
        )}

        {crews.length === 0 ? (
          <div className="bg-steel-900/50 border border-steel-800 p-12 text-center rounded-lg">
            <Users className="w-12 h-12 text-steel-600 mx-auto mb-4" />
            <h3 className="text-lg font-display text-ink-300">No Teams Found</h3>
            <p className="text-ink-500 text-sm mt-1">Be the first to register a team and start building your legacy.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crews.map(crew => {
              const isMember = myCrewIds.has(crew.id)
              
              return (
                <div 
                  key={crew.id}
                  onClick={() => handleViewTeam(crew)}
                  className={clsx(
                    "group bg-steel-900 border p-5 rounded-lg cursor-pointer transition-all hover:-translate-y-1",
                    isMember ? "border-nexus-500/50 shadow-[0_0_15px_rgba(0,188,212,0.1)]" : "border-steel-700 hover:border-steel-500"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-display font-black text-ink-100 tracking-wider">
                        <span className="text-nexus-400 mr-2">[{crew.tag}]</span>
                        {crew.name}
                      </h3>
                      <p className="text-[10px] font-mono text-ink-500 mt-1 uppercase">
                        Est. {new Date(crew.created_at).getFullYear()}
                      </p>
                    </div>
                    {isMember && (
                      <div className="px-2 py-1 bg-nexus-500/20 text-nexus-400 text-[10px] font-mono rounded font-bold">
                        JOINED
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center text-xs font-mono text-ink-400 group-hover:text-nexus-400 transition-colors">
                    VIEW ROSTER <ChevronRight size={14} className="ml-1" />
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
