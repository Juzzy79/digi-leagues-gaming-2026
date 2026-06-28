import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMessages, sendMessage } from '../services/messageService'
import { Send, Hash, MessageSquare, Shield, Swords, Zap, Crosshair } from 'lucide-react'
import Button from '../components/Button'
import { getUserCrew } from '../services/crewService'
import type { Crew } from '../services/crewService'
import { supabase } from '../services/supabase'
import { soundEngine } from '../utils/SoundEngine'
import { createChallenge } from '../services/challengeService'
import toast from 'react-hot-toast'

export default function Messaging() {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [myCrew, setMyCrew] = useState<Crew | null>(null)
  const [activeChannel, setActiveChannel] = useState<'general' | 'lfg' | 'tournaments' | 'crew'>('general')
  
  // Fetch crew on load
  useEffect(() => {
    if (user) {
      getUserCrew(user.id).then(({ data }) => {
        if (data) setMyCrew(data)
      })
    }
  }, [user])

  // Initial load + Realtime
  useEffect(() => {
    let cancelled = false
    const channelId = activeChannel === 'crew' && myCrew ? `crew_${myCrew.id}` : activeChannel
    
    // Initial fetch
    getMessages(channelId, 50).then(({ data }) => {
      if (!cancelled && data) {
        setMessages(data)
      }
    })
    
    // Realtime subscription
    const sub = supabase.channel(`public:messages:${channelId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, payload => {
        if (!cancelled) {
          setMessages(prev => [...prev, payload.new])
        }
      })
      .subscribe()
    
    return () => {
      cancelled = true
      supabase.removeChannel(sub)
    }
  }, [activeChannel, myCrew])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user || !profile) return
    
    setSending(true)
    const channelId = activeChannel === 'crew' && myCrew ? `crew_${myCrew.id}` : activeChannel
    const { success } = await sendMessage(user.id, profile.username, content, channelId)
    setSending(false)
    
    if (success) {
      soundEngine.playSuccess()
      setContent('')
      // Don't refetch, let realtime handle it
    }
  }

  const handleLfgChallenge = async (opponentId: string, opponentName: string, gameString: string) => {
    if (!user || !profile) return;
    soundEngine.playTick();
    const game = gameString || 'Shooter'; // Default
    
    const { success } = await createChallenge({
      challenger_id: user.id,
      challenger_name: profile.username || 'Operator',
      opponent_id: opponentId,
      opponent_name: opponentName,
      game,
      duration_hours: 24,
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    });

    if (success) {
      toast.success('CHALLENGE TRANSMITTED');
    } else {
      toast.error('FAILED TO TRANSMIT CHALLENGE');
    }
  }

  const switchChannel = (chan: 'general' | 'lfg' | 'tournaments' | 'crew') => {
    soundEngine.playTick()
    setActiveChannel(chan)
  }

  return (
    <div className="flex-1 w-full h-[calc(100vh-theme(spacing.16))] lg:h-screen flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-4xl bg-steel-900 border border-steel-700/50 rounded-lg flex flex-col h-full overflow-hidden shadow-xl">
        
        <div className="bg-steel-950 p-4 border-b border-steel-800 flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${
              activeChannel === 'crew' ? 'bg-rank-gold/10 border-rank-gold/30 text-rank-gold' : 
              activeChannel === 'lfg' ? 'bg-threat-500/10 border-threat-500/30 text-threat-400' :
              activeChannel === 'tournaments' ? 'bg-pulse-500/10 border-pulse-500/30 text-pulse-400' :
              'bg-nexus-900/30 border-nexus-500/30 text-nexus-500'}`}>
              {activeChannel === 'crew' ? <Shield size={20} /> : 
               activeChannel === 'lfg' ? <Crosshair size={20} /> :
               activeChannel === 'tournaments' ? <Swords size={20} /> :
               <Hash size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-display font-bold uppercase tracking-widest text-ink-100">
                {activeChannel === 'crew' ? myCrew?.name || 'Crew Comms' : 
                 activeChannel === 'lfg' ? 'LFG Board' :
                 activeChannel === 'tournaments' ? 'Tournaments' :
                 'Global Comms'}
              </h2>
              <p className="text-xs font-mono text-ink-400">
                {activeChannel === 'crew' ? 'Encrypted frequency' : 
                 activeChannel === 'lfg' ? 'Looking for group / Scrims' :
                 activeChannel === 'tournaments' ? 'Official circuit chat' :
                 'Open frequency for all operators'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap bg-steel-900 border border-steel-700 rounded-lg p-1 gap-1">
            <button 
              onClick={() => switchChannel('general')}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest rounded ${activeChannel === 'general' ? 'bg-nexus-500 text-steel-950 shadow-[0_0_10px_rgba(45,212,191,0.3)]' : 'text-ink-500 hover:text-ink-300'}`}
            >
              Global
            </button>
            <button 
              onClick={() => switchChannel('lfg')}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest rounded ${activeChannel === 'lfg' ? 'bg-threat-500 text-steel-950 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'text-ink-500 hover:text-ink-300'}`}
            >
              LFG
            </button>
            <button 
              onClick={() => switchChannel('tournaments')}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest rounded ${activeChannel === 'tournaments' ? 'bg-pulse-500 text-steel-950 shadow-[0_0_10px_rgba(0,255,231,0.3)]' : 'text-ink-500 hover:text-ink-300'}`}
            >
              Trny
            </button>
            {myCrew && (
              <button 
                onClick={() => switchChannel('crew')}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest rounded ${activeChannel === 'crew' ? 'bg-rank-gold text-steel-950 shadow-[0_0_10px_rgba(255,215,0,0.3)]' : 'text-ink-500 hover:text-ink-300'}`}
              >
                Crew
              </button>
            )}
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-ink-500">
              <MessageSquare size={32} className="mb-3 opacity-20" />
              <p className="font-mono text-sm uppercase tracking-widest">FREQUENCY CLEAR</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.sender_id === user?.id
              const isLfgPost = msg.content.startsWith('!lfg')
              const gameTarget = isLfgPost ? msg.content.replace('!lfg', '').trim() : ''

              return (
                <div key={msg.id || idx} className={`flex max-w-[80%] ${isMine ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}>
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-ink-400 mb-1 ml-1 mr-1">
                      {isMine ? 'YOU' : msg.sender_name}
                    </span>
                    <div className={`px-4 py-2.5 rounded-2xl ${
                      isMine 
                        ? (activeChannel === 'crew' ? 'bg-rank-gold/10 border border-rank-gold/30 rounded-br-sm text-rank-gold' : 
                           activeChannel === 'lfg' ? 'bg-threat-500/10 border border-threat-500/30 rounded-br-sm text-threat-400' :
                           activeChannel === 'tournaments' ? 'bg-pulse-500/10 border border-pulse-500/30 rounded-br-sm text-pulse-400' :
                           'bg-nexus-500/10 border border-nexus-500/30 rounded-br-sm text-nexus-100')
                        : 'bg-steel-800 border border-steel-700 rounded-bl-sm text-ink-100'
                    }`}>
                      <p className="font-body text-sm whitespace-pre-wrap">{msg.content}</p>
                      {isLfgPost && !isMine && (
                        <div className="mt-2">
                          <button 
                            onClick={() => handleLfgChallenge(msg.sender_id, msg.sender_name, gameTarget)}
                            className="bg-threat-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-threat-400 transition-colors"
                          >
                            <Crosshair size={12} /> Challenge Target
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-ink-500 font-mono mt-1 ml-1 mr-1 opacity-50">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="bg-steel-950 p-4 border-t border-steel-800 shrink-0">
          <form className="flex gap-3" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Transmit message..."
              className="flex-1 bg-steel-900 border border-steel-700 rounded-full px-5 py-3 text-sm font-body text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-nexus-500 transition-colors"
              value={content}
              onChange={e => setContent(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" variant="primary" className="!rounded-full px-5" disabled={!content.trim() || sending}>
              <Send size={18} className={sending ? 'animate-pulse' : ''} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
