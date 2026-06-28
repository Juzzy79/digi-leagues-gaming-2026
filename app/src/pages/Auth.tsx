import { useState } from 'react'
import { signIn, signUp } from '../services/authService'
import Button from '../components/Button'

export default function Auth() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (tab === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      if (!username.trim()) { setError('Username is required'); setLoading(false); return }
      const { error } = await signUp(email, password, username.trim())
      if (error) setError(error.message)
      else setSuccess('Account created! Check your email to confirm, then log in.')
    }
    setLoading(false)
  }

  const inputClass = 'w-full h-10 px-3 bg-steel-700 border border-steel-600 text-ink-100 rounded placeholder:text-ink-500 focus:border-nexus-500 focus:ring-1 focus:ring-nexus-500/30 focus:outline-none transition-colors'

  return (
    <div className="min-h-dvh bg-steel-950 flex items-center justify-center p-4">
      {/* Background grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,168,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,168,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold uppercase tracking-widest text-nexus-400">
            DIGI LEAGUES
          </h1>
          <p className="text-ink-500 text-sm mt-1 font-mono tracking-wider">COMPETITIVE GAMING PLATFORM</p>
        </div>

        {/* Card */}
        <div className="bg-steel-900 border border-steel-600 rounded-lg p-6">
          {/* Tabs */}
          <div className="flex border-b border-steel-700 mb-6">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className={`flex-1 pb-3 text-sm font-display font-bold uppercase tracking-wider transition-colors ${
                  tab === t
                    ? 'text-nexus-400 border-b-2 border-nexus-500 -mb-px'
                    : 'text-ink-500 hover:text-ink-300'
                }`}
              >
                {t === 'login' ? 'SIGN IN' : 'REGISTER'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs text-ink-500 uppercase tracking-widest mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="YourCallsign"
                  className={inputClass}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-ink-500 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operator@digileagues.gg"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-ink-500 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
              />
            </div>

            {error && (
              <div className="bg-threat-900 border border-threat-500/30 rounded px-3 py-2 text-threat-500 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-victory-900 border border-victory-500/30 rounded px-3 py-2 text-victory-500 text-sm">
                {success}
              </div>
            )}

            <Button variant="primary" className="w-full mt-2" isLoading={loading}>
              {tab === 'login' ? 'ENTER THE ARENA' : 'CREATE ACCOUNT'}
            </Button>
          </form>
        </div>

        <p className="text-center text-ink-500 text-xs mt-4">
          MMR STARTS AT 1000 · CLIMB THE RANKS · CLAIM DOG TAGS
        </p>
      </div>
    </div>
  )
}
