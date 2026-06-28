import { useState, useEffect } from 'react'
import { getFeed } from '../services/feedService'
import { supabase } from '../services/supabase'
import { Activity, Clock } from 'lucide-react'

export default function ActivityFeed({ className = '' }: { className?: string }) {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false;
    
    // Initial fetch
    getFeed(20).then(({ data }) => {
      if (!cancelled) {
        if (data) setFeed(data);
        setLoading(false);
      }
    });

    // Realtime subscription
    const channel = supabase.channel('public:activity_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, payload => {
        if (!cancelled) {
          setFeed(prev => [payload.new, ...prev].slice(0, 50));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    }
  }, [])

  if (loading && feed.length === 0) {
    return (
      <div className={`bg-steel-900 border border-steel-600 rounded-lg p-6 flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="text-nexus-400 font-mono text-sm animate-pulse flex items-center gap-2">
          <Activity size={16} /> INTERCEPTING COMMS...
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-steel-900 border border-steel-600 rounded-lg flex flex-col ${className}`}>
      <div className="p-4 border-b border-steel-700 flex items-center gap-2">
        <Activity size={18} className="text-nexus-400" />
        <h2 className="text-sm font-display font-bold uppercase tracking-widest text-ink-100">Live Activity Feed</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {feed.length === 0 ? (
          <div className="p-8 text-center text-ink-500 font-mono text-sm uppercase">
            No recent activity detected
          </div>
        ) : (
          feed.map(item => (
            <div key={item.id} className="flex gap-3 p-3 rounded hover:bg-steel-800/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-steel-800 border-2 border-steel-700 flex-shrink-0 overflow-hidden flex items-center justify-center flex-col">
                {item.user_avatar ? (
                  <img src={item.user_avatar} alt={item.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-bold text-nexus-500 text-xs text-center leading-none">{item.username.substring(0,2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body text-ink-300">
                  <span className="font-bold text-ink-100">{item.username}</span> {item.description}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-500 font-mono uppercase">
                  <Clock size={10} />
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
