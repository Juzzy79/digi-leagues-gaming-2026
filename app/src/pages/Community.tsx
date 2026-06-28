import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllProfiles } from '../services/profileService'
import type { Profile } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'
import TierBadge from '../components/TierBadge'
import { Search, User, Trash2 } from 'lucide-react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export default function Community() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const { profile: currentUser } = useAuth()

  useEffect(() => {
    let cancelled = false
    getAllProfiles().then(({ data }) => {
      if (!cancelled) {
        setProfiles(data || [])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const handleDeleteUser = async (e: React.MouseEvent, targetId: string, username: string) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to completely erase Operator ${username} from the system? This action is permanent and deletes all stats/history.`)) return;

    // Call Supabase RPC to delete user
    const { error } = await supabase.rpc('delete_user_by_admin', { user_id: targetId });
    if (error) {
      // Fallback: try to delete from public.profiles directly if RPC is missing
      const { error: profileErr } = await supabase.from('profiles').delete().eq('id', targetId);
      if (profileErr) {
        toast.error("Deletion failed: " + (error.message || profileErr.message));
      } else {
        toast.success(`Operator ${username} profile wiped.`);
        setProfiles(prev => prev.filter(p => p.id !== targetId));
      }
    } else {
      toast.success(`Operator ${username} completely deleted.`);
      setProfiles(prev => prev.filter(p => p.id !== targetId));
    }
  }

  const filtered = profiles.filter(p => 
    p.username.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-nexus-400 font-mono text-sm animate-pulse">SCANNING DIRECTORY...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wider text-ink-100">
            Active Personnel
          </h1>
          <p className="text-ink-500 text-sm mt-1">
            Global directory of all registered operators.
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input 
            type="text" 
            placeholder="Search roster..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-steel-900 border border-steel-700 rounded text-sm text-ink-100 font-body placeholder:text-ink-600 focus:outline-none focus:border-nexus-500 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-ink-500 font-mono text-sm uppercase">
            No matching operators found
          </div>
        ) : (
          filtered.map(profile => (
            <div key={profile.id} className="relative group w-full">
              {currentUser?.is_admin && currentUser.id !== profile.id && (
                <button
                  onClick={(e) => handleDeleteUser(e, profile.id, profile.username)}
                  className="absolute top-3 right-3 p-1.5 rounded bg-threat-900/20 hover:bg-threat-900/50 text-threat-500 border border-threat-500/30 opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center justify-center"
                  title="Wipe Operator Record"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <Link 
                to={`/app/profile/${profile.id}`}
                className="bg-steel-900 border border-steel-700 rounded-lg p-5 hover:border-nexus-500 hover:bg-steel-800 transition-all flex flex-col items-center text-center w-full h-full"
              >
                <div className="w-20 h-20 rounded bg-steel-800 border-2 border-steel-700 mb-4 overflow-hidden flex items-center justify-center group-hover:border-nexus-400 transition-colors">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-steel-600" />
                  )}
                </div>
                <h3 className="text-lg font-display font-bold text-ink-100 tracking-wide truncate w-full">{profile.username}</h3>
                <TierBadge rating={profile.usr || 1000} className="mt-2" showRating />
                
                <div className="w-full grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-steel-800">
                  <div>
                    <p className="text-[10px] text-ink-500 font-mono uppercase tracking-widest">Wins</p>
                    <p className="font-mono text-victory-500 font-bold">{profile.wins}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-500 font-mono uppercase tracking-widest">Win %</p>
                    <p className="font-mono text-nexus-400 font-bold">{profile.win_rate}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
