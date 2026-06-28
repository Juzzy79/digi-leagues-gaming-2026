import { useEffect, useRef, useState } from 'react'
import { Bell, X, Crosshair, TrendingUp, Shield, Swords, Timer, CheckCircle2 } from 'lucide-react'
import { getNotifications, markAllRead } from '../services/notificationService'
import type { Notification } from '../services/notificationService'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

const TYPE_ICON: Record<string, React.ReactNode> = {
  challenge_received: <Crosshair size={14} className="text-duel-500" />,
  rank_overtaken: <TrendingUp size={14} className="text-threat-500" />,
  dog_tag_at_risk: <Shield size={14} className="text-rank-gold" />,
  tournament_starting: <Swords size={14} className="text-nexus-400" />,
  weekly_track_beaten: <Timer size={14} className="text-pulse-400" />,
  daily_op_complete: <CheckCircle2 size={14} className="text-victory-500" />,
  streak_reminder: <span className="text-sm">🔥</span>,
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Poll every 15 seconds
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const fetch = async () => {
      const { data, unreadCount } = await getNotifications(user.id)
      if (!cancelled) {
        setNotifications(data)
        setUnreadCount(unreadCount)
      }
    }

    fetch()
    const interval = setInterval(fetch, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [user?.id])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = async () => {
    setOpen(o => !o)
    if (!open && user?.id && unreadCount > 0) {
      await markAllRead(user.id)
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        id="notification-bell"
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-ink-400 hover:text-ink-100 hover:bg-steel-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-threat-500 text-[9px] font-black text-white rounded-full flex items-center justify-center px-0.5 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-steel-900 border border-steel-700 rounded-lg shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-steel-700 bg-steel-950">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-nexus-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-ink-100">Intel Feed</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-ink-500 hover:text-ink-100 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-steel-800">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-ink-600">
                <Bell size={24} className="opacity-30" />
                <p className="text-xs font-mono uppercase tracking-wider">No intel received</p>
              </div>
            ) : (
              notifications.map(n => {
                const isOvertake = n.type === 'rank_overtaken';
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-all ${
                      isOvertake 
                        ? 'bg-threat-900/20 border-l-2 border-threat-500 hover:bg-threat-900/40 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]' 
                        : `hover:bg-steel-800/50 ${!n.is_read ? 'bg-nexus-900/10' : ''}`
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${isOvertake ? 'bg-threat-950 border border-threat-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-steel-800 w-6 h-6'}`}>
                      {TYPE_ICON[n.type] ?? <Bell size={isOvertake ? 16 : 12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.link ? (
                        <Link to={n.link} onClick={() => setOpen(false)} className="block group">
                          <p className={`font-mono font-bold uppercase tracking-wider transition-colors ${isOvertake ? 'text-sm text-threat-400 group-hover:text-threat-300' : 'text-xs text-ink-100 group-hover:text-nexus-400'}`}>
                            {n.title}
                          </p>
                          <p className={`font-body mt-0.5 leading-snug ${isOvertake ? 'text-xs text-ink-300' : 'text-[11px] text-ink-400'}`}>
                            {n.body}
                          </p>
                        </Link>
                      ) : (
                        <>
                          <p className={`font-mono font-bold uppercase tracking-wider ${isOvertake ? 'text-sm text-threat-400' : 'text-xs text-ink-100'}`}>
                            {n.title}
                          </p>
                          <p className={`font-body mt-0.5 leading-snug ${isOvertake ? 'text-xs text-ink-300' : 'text-[11px] text-ink-400'}`}>
                            {n.body}
                          </p>
                        </>
                      )}
                      <span className="text-[10px] text-ink-600 font-mono mt-1 block">{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.is_read && (
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${isOvertake ? 'bg-threat-500 animate-pulse' : 'bg-nexus-400'}`} />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-steel-700 bg-steel-950">
              <p className="text-[10px] font-mono text-ink-600 uppercase tracking-widest text-center">
                Showing last {notifications.length} transmissions
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
