import { useEffect, useState } from 'react'
import { Trophy, ChevronRight, Crown, Star, History } from 'lucide-react'
import { supabase } from '../services/supabase'

interface ChampionData {
  id: string
  name: string
  tier: string
  game: string
  format: string
  created_at: string
  winner: {
    username: string
    avatar_url: string
  }
}

export default function HallOfFame() {
  const [champions, setChampions] = useState<ChampionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadChampions() {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select(`
            id, name, tier, game, format, created_at,
            profiles!tournaments_winner_id_fkey(username, avatar_url)
          `)
          .eq('status', 'completed')
          .not('winner_id', 'is', null)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        setChampions(data?.map(t => ({
          ...t,
          winner: t.profiles
        })) || [])
      } catch (err) {
        console.error("Failed to load HOF", err)
      } finally {
        setLoading(false)
      }
    }
    
    loadChampions()
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl lg:text-5xl font-display font-black text-ink-50 uppercase tracking-tighter drop-shadow-md">
          Hall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-victory-400 to-pulse-400">Fame</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-ink-500 font-mono tracking-widest animate-pulse">
            ACCESSING ARCHIVES...
          </div>
        ) : champions.length === 0 ? (
          <div className="col-span-full bg-steel-900/30 border border-steel-800 border-dashed rounded-xl p-20 text-center flex flex-col items-center">
             <History size={48} className="text-steel-700 mb-4" />
             <p className="text-ink-500 font-mono text-sm uppercase tracking-widest">No historical records found. The legacy begins now.</p>
          </div>
        ) : (
          champions.map((champ, i) => (
            <div key={champ.id} className="bg-steel-950 border border-steel-700 rounded-2xl overflow-hidden group hover:border-victory-500/50 transition-colors shadow-xl">
              <div className="h-32 bg-steel-900 relative flex items-center justify-center overflow-hidden border-b border-steel-800">
                <div className="absolute inset-0 bg-gradient-to-br from-victory-500/20 to-transparent" />
                <Trophy size={64} className="text-victory-500/10 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute -bottom-10 shadow-2xl">
                   <div className="w-20 h-20 rounded-full border-4 border-steel-950 bg-steel-900 overflow-hidden relative">
                      {champ.winner.avatar_url ? (
                        <img src={champ.winner.avatar_url} alt={champ.winner.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-display text-ink-500">{champ.winner.username.charAt(0)}</div>
                      )}
                   </div>
                   {i === 0 && (
                      <div className="absolute -top-3 -right-2 text-victory-400 bg-steel-950 rounded-full p-1 animate-pulse">
                        <Crown size={16} />
                      </div>
                   )}
                </div>
              </div>
              
              <div className="pt-14 pb-6 px-6 text-center space-y-2 relative">
                <h2 className="text-2xl font-display font-black uppercase text-ink-100 tracking-wide">{champ.winner.username}</h2>
                <div className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">
                  Champion of <span className="text-nexus-400 font-bold">{champ.name}</span>
                </div>
                
                <div className="flex items-center justify-center gap-3 pt-4">
                   <span className="px-2 py-0.5 rounded bg-steel-900 text-ink-400 text-[9px] font-mono uppercase tracking-widest border border-steel-800">{champ.game}</span>
                   <span className="px-2 py-0.5 rounded bg-steel-900 text-ink-400 text-[9px] font-mono uppercase tracking-widest border border-steel-800">{champ.tier}</span>
                </div>
                <div className="absolute bottom-2 right-4 text-[9px] font-mono text-steel-700">{new Date(champ.created_at).getFullYear()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
