import { useState, useEffect } from 'react'

export function usePartySession() {
  const [partyMembers, setPartyMembers] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('activePartyMembers')
      if (stored) {
        setPartyMembers(JSON.parse(stored))
      }
    } catch (err) {
      console.error('Failed to parse party members', err)
    }
  }, [])

  const saveParty = (members: string[]) => {
    setPartyMembers(members)
    localStorage.setItem('activePartyMembers', JSON.stringify(members))
  }

  const addMember = (name: string) => {
    if (!name.trim()) return
    if (partyMembers.includes(name.trim())) return
    saveParty([...partyMembers, name.trim()])
  }

  const removeMember = (name: string) => {
    saveParty(partyMembers.filter(m => m !== name))
  }

  const disbandParty = () => {
    saveParty([])
  }

  return {
    partyMembers,
    addMember,
    removeMember,
    disbandParty
  }
}
