import { useState } from 'react'
import { usePartySession } from '../hooks/usePartySession'
import { Users, UserPlus, X, ShieldAlert } from 'lucide-react'

export default function CoOpPartyPanel() {
  const { partyMembers, addMember, removeMember, disbandParty } = usePartySession()
  const [newMember, setNewMember] = useState('')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMember.trim()) {
      addMember(newMember)
      setNewMember('')
    }
  }

  return (
    <div className="bg-steel-900 border border-steel-800 rounded-lg p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-black text-nexus-400 tracking-widest uppercase flex items-center gap-2">
          <Users size={16} /> Active Party Session
        </h3>
        {partyMembers.length > 0 && (
          <button 
            onClick={disbandParty}
            className="text-[10px] font-bold font-mono text-threat-500 hover:text-threat-400 uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            <ShieldAlert size={12} /> Disband
          </button>
        )}
      </div>

      <p className="text-xs text-ink-400 font-mono mb-4 leading-relaxed">
        Establish a local session with your squad. Their stats can be dynamically tracked when you log match results.
      </p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input 
          type="text"
          value={newMember}
          onChange={e => setNewMember(e.target.value)}
          placeholder="Operator gamertag..."
          className="flex-1 bg-steel-950 border border-steel-700 rounded p-2 text-ink-100 font-body text-sm focus:border-nexus-500 focus:outline-none"
        />
        <button 
          type="submit"
          className="bg-nexus-500/10 text-nexus-400 border border-nexus-500/30 px-3 py-2 rounded hover:bg-nexus-500 hover:text-white transition-colors"
        >
          <UserPlus size={18} />
        </button>
      </form>

      {partyMembers.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-steel-700 rounded bg-steel-900/50">
          <span className="text-xs font-mono text-ink-500 uppercase tracking-widest">No active party members</span>
        </div>
      ) : (
        <div className="space-y-2">
          {partyMembers.map(member => (
            <div key={member} className="flex items-center justify-between bg-steel-950 p-2.5 rounded border border-steel-800 group">
              <span className="text-sm font-bold text-ink-100 tracking-wider flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-nexus-500 animate-pulse" />
                {member}
              </span>
              <button 
                onClick={() => removeMember(member)}
                className="text-ink-500 hover:text-threat-500 transition-colors opacity-50 group-hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
