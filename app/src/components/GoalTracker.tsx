import { useEffect, useState } from 'react'
import { Target, Flag, Edit2 } from 'lucide-react'
import { getActiveGoal, createGoal, updateGoalStatus } from '../services/goalService'
import type { Goal } from '../services/goalService'
import { useAuth } from '../context/AuthContext'
import Button from './Button'

export default function GoalTracker() {
  const { user, profile } = useAuth()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [targetUsr, setTargetUsr] = useState('')

  useEffect(() => {
    if (!user) return
    getActiveGoal(user.id).then(({ data }) => {
      setGoal(data)
      setLoading(false)
    })
  }, [user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !title.trim()) return
    setLoading(true)
    
    const usrNum = targetUsr ? Number(targetUsr) : undefined
    const { success, data } = await createGoal(user.id, title, usrNum)
    if (success) {
      setGoal(data)
      setIsEditing(false)
    }
    setLoading(false)
  }

  async function handleComplete() {
    if (!goal) return
    await updateGoalStatus(goal.id, 'achieved')
    setGoal(null)
  }

  if (loading) return <div className="h-24 bg-steel-900 border border-steel-700 rounded-lg animate-pulse" />

  if (isEditing || !goal) {
    return (
      <div className="bg-steel-900 border border-steel-700 rounded-lg p-4">
        <h3 className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Target size={14} className="text-nexus-400" /> Set Objectives
        </h3>
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            placeholder="Goal (e.g. Reach Gold by July)"
            className="w-full bg-steel-950 border border-steel-800 rounded px-3 py-2 text-sm text-ink-100 placeholder-ink-600 focus:border-nexus-500 focus:outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Target USR (Optional)"
              className="flex-1 bg-steel-950 border border-steel-800 rounded px-3 py-2 text-sm text-ink-100 placeholder-ink-600 focus:border-nexus-500 focus:outline-none"
              value={targetUsr}
              onChange={e => setTargetUsr(e.target.value)}
            />
            <Button variant="primary" type="submit" disabled={loading} className="!py-2 !px-4 shrink-0 text-xs">
              Lock In
            </Button>
            {goal && (
              <Button variant="secondary" onClick={() => setIsEditing(false)} className="!py-2 !px-3 shrink-0 text-xs">Cancel</Button>
            )}
          </div>
        </form>
      </div>
    )
  }

  let progress = 0;
  if (goal.target_usr && profile?.usr) {
    // Arbitrary base of 1000 for progress bar scale
    const base = Math.min(1000, profile.usr - 100);
    const range = goal.target_usr - base;
    const current = profile.usr - base;
    progress = Math.max(0, Math.min(100, (current / range) * 100));
  }

  return (
    <div className="bg-steel-900 border border-steel-700 rounded-lg p-4 relative group">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
         <button onClick={() => handleComplete()} className="text-[10px] bg-victory-500/20 text-victory-400 px-2 py-0.5 rounded uppercase font-bold hover:bg-victory-500/40">Complete</button>
         <button onClick={() => { setTitle(goal.title); setTargetUsr(goal.target_usr?.toString() || ''); setIsEditing(true); }} className="text-ink-500 hover:text-ink-300">
           <Edit2 size={12} />
         </button>
      </div>
      <h3 className="text-xs font-mono text-ink-500 uppercase tracking-widest mb-1 flex items-center gap-2">
        <Target size={14} className="text-nexus-400" /> Active Objective
      </h3>
      <p className="text-sm font-display font-bold text-ink-100 pr-20">{goal.title}</p>
      
      {goal.target_usr && (
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-ink-500">
            <span>{profile?.usr || 1000} USR</span>
            <span>{goal.target_usr} USR</span>
          </div>
          <div className="w-full h-1.5 bg-steel-950 rounded-full overflow-hidden">
            <div className="h-full bg-nexus-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
