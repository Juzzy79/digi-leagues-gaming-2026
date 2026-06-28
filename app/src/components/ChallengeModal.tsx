// src/components/ChallengeModal.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, X, Clock, Gamepad2, AlertCircle } from 'lucide-react'
import Button from './Button'
import { createChallenge } from '../services/challengeService'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

interface ChallengeModalProps {
  opponentId: string
  opponentName: string
  onClose: () => void
}

const COMMON_GAMES = [
  'Call of Duty: Black Ops 7',
  'Valorant',
  'Counter-Strike 2',
  'Halo Infinite',
  'Forza Motorsport',
  'F1 2026',
  'Street Fighter 6',
  'Tekken 8',
  'EA FC 26',
  'Rocket League'
]

export default function ChallengeModal({ opponentId, opponentName, onClose }: ChallengeModalProps) {
  const { user, profile } = useAuth()
  const [game, setGame] = useState('')
  const [customGame, setCustomGame] = useState('')
  const [rules, setRules] = useState('')
  const [duration, setDuration] = useState('24')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    const selectedGame = game === 'custom' ? customGame : game
    if (!selectedGame.trim()) {
      toast.error('You must specify a game to challenge.')
      return
    }

    setSubmitting(true)
    const durationHours = parseInt(duration)
    const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

    const { success, error } = await createChallenge({
      challenger_id: user.id,
      challenger_name: profile.username,
      opponent_id: opponentId,
      opponent_name: opponentName,
      game: selectedGame,
      rules: rules.trim() || null,
      duration_hours: durationHours,
      end_time: endTime,
      status: 'pending'
    })

    setSubmitting(false)

    if (success) {
      toast.success(`Challenge issued to ${opponentName}!`)
      onClose()
    } else {
      toast.error(error?.message || 'Failed to issue challenge.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-steel-950 border border-threat-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] rounded-lg p-6 max-w-md w-full relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-500 hover:text-ink-300 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-threat-950 border-2 border-threat-500 rounded flex items-center justify-center text-threat-500">
            <Target size={20} />
          </div>
          <div>
            <h2 className="font-display font-bold uppercase text-ink-100 tracking-widest leading-tight">
              Issue Challenge
            </h2>
            <p className="text-xs font-mono text-threat-400">Target: {opponentName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-ink-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Gamepad2 size={12} /> Combat Theater
            </label>
            <select 
              value={game}
              onChange={e => setGame(e.target.value)}
              className="w-full bg-steel-900 border border-steel-700 text-ink-100 rounded px-3 py-2 text-sm focus:border-threat-500 outline-none"
              required
            >
              <option value="" disabled>Select a Game...</option>
              {COMMON_GAMES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
              <option value="custom">-- Custom Game --</option>
            </select>
          </div>

          {game === 'custom' && (
            <div>
              <input 
                type="text"
                placeholder="Enter custom game name..."
                value={customGame}
                onChange={e => setCustomGame(e.target.value)}
                className="w-full bg-steel-900 border border-steel-700 text-ink-100 rounded px-3 py-2 text-sm focus:border-threat-500 outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono text-ink-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <AlertCircle size={12} /> Rules of Engagement (Optional)
            </label>
            <input 
              type="text"
              placeholder="e.g. Best of 3, No snipers, Final Destination..."
              value={rules}
              onChange={e => setRules(e.target.value)}
              className="w-full bg-steel-900 border border-steel-700 text-ink-100 rounded px-3 py-2 text-sm focus:border-threat-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-ink-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Clock size={12} /> Time Limit
            </label>
            <select 
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full bg-steel-900 border border-steel-700 text-ink-100 rounded px-3 py-2 text-sm focus:border-threat-500 outline-none"
            >
              <option value="1">1 Hour (Blitz)</option>
              <option value="24">24 Hours (Standard)</option>
              <option value="48">48 Hours (Extended)</option>
              <option value="168">1 Week (Campaign)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-steel-800">
            <Button 
              type="submit" 
              variant="danger" 
              className="w-full font-black tracking-widest py-3 uppercase"
              disabled={submitting}
            >
              {submitting ? 'Transmitting...' : 'Declare War'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
