import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { submitMatch, getMatchHistory, getUniqueTracksForGame } from '../services/matchService'
import { getAcceptedChallenges } from '../services/challengeService'
import type { Challenge } from '../services/challengeService'
import { GENRES } from '../services/rankingService'
import Button from '../components/Button'
import { 
  Trophy, AlertTriangle, Skull, 
  Monitor, Cpu, Activity, ChevronRight,
  Gamepad2, Target, Timer, Award, Plus, X, Users
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getWeeklyChallengeInfo } from './Leaderboard'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'
import PromotionModal from '../components/PromotionModal'
import { soundEngine } from '../utils/SoundEngine'
import { usePartySession } from '../hooks/usePartySession'

const POPULAR_GAMES_BY_GENRE: Record<string, string[]> = {
  'Shooter': ['Call of Duty: Black Ops 7', 'Valorant', 'Counter-Strike 2', 'Halo Infinite'],
  'Battle Royale': ['Call of Duty: Warzone', 'Apex Legends', 'Fortnite'],
  'Racing': ['Forza Horizon 6', 'Forza Motorsport', 'Gran Turismo 7', 'F1 23'],
  'Puzzle': ['Pickle Pete', 'Tetris Effect', 'Sudoku Grand Prix'],
  'Fighter': ['Street Fighter 6', 'Tekken 8', 'Super Smash Bros. Ultimate']
};

// const isAiEnabled = import.meta.env.VITE_AI_VERIFY_ENABLED === 'true'

export default function ResultSubmission() {
  const { user, profile, setProfile } = useAuth()
  const { partyMembers } = usePartySession()
  const navigate = useNavigate()
  const [activeChallenge, setActiveChallenge] = useState<any>(null)
  
  useEffect(() => {
    supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'active_weekly_challenge')
      .single()
      .then(({ data }) => {
        if (data && data.value) {
          setActiveChallenge(data.value)
        }
      })
  }, [])
  
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedGenre, setSelectedGenre] = useState<string>('Shooter')
  const [game, setGame] = useState('')
  const [result, setResult] = useState<'Win' | 'Loss' | 'Solo'>('Win')
  const [isPractice, setIsPractice] = useState(false)
  const [isAi, setIsAi] = useState(false)
  const [stats, setStats] = useState<Record<string, any>>({})
  const [history, setHistory] = useState<any[]>([])
  
  // Custom Time Trial / Racing Stats States
  const [trackName, setTrackName] = useState('')
  const [timeMin, setTimeMin] = useState('')
  const [timeSec, setTimeSec] = useState('')
  const [timeMs, setTimeMs] = useState('')
  const [popularTracks, setPopularTracks] = useState<string[]>([])
  
  const [carClass, setCarClass] = useState('')
  const [carHp, setCarHp] = useState('')
  
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallengeId, setSelectedChallengeId] = useState('')
  
  const [fighterGameResults, setFighterGameResults] = useState<{winner: 'player'|'opponent'|null, playerPerfect: boolean}[]>([{ winner: null, playerPerfect: false }]);
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{ change: number, newUsr: number, isPromotion?: boolean, newTierName?: string } | null>(null)
  const [showPromotion, setShowPromotion] = useState(false)

  useEffect(() => {
    if (!user) return
    getAcceptedChallenges(user.id).then(({ data }) => setChallenges(data || []))
    getMatchHistory(user.id).then(({ data }) => setHistory(data || []))
  }, [user])

  useEffect(() => {
    if (selectedGenre === 'Racing' && game) {
      getUniqueTracksForGame(game).then(tracks => setPopularTracks(tracks))
    }
    if (selectedGenre === 'Puzzle') {
      setResult('Solo')
    } else {
      setResult('Win')
    }
  }, [selectedGenre, game])

  const genreConfig = GENRES[selectedGenre] || GENRES['Shooter']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !profile) return
    
    if (!game.trim()) {
      setError('Please specify the operation/game title.')
      return
    }

    setSubmitting(true)
    setError('')
    
    let finalStats = { ...stats };
    let finalResult = result;

    if (selectedGenre === 'Racing') {
      const min = parseFloat(timeMin) || 0;
      const sec = parseFloat(timeSec) || 0;
      const ms = parseFloat(timeMs) || 0;
      const totalSec = min * 60 + sec + ms / 1000;
      finalStats = {
        ...finalStats,
        track_name: trackName,
        total_time: totalSec,
        car_class: carClass || undefined,
        car_hp: carHp ? parseFloat(carHp) : undefined
      };
      finalResult = 'Solo';
    } else if (selectedGenre === 'Fighter') {
      let playerWins = 0;
      let opponentWins = 0;
      let perfectRounds = 0;
      fighterGameResults.forEach(g => {
        if (g.winner === 'player') playerWins++;
        if (g.winner === 'opponent') opponentWins++;
        if (g.playerPerfect) perfectRounds++;
      });
      finalResult = playerWins >= opponentWins ? 'Win' : 'Loss';
      finalStats = {
        ...finalStats,
        wins_in_set: playerWins,
        perfect_rounds: perfectRounds
      };
    }

    const res = await submitMatch(user.id, {
      game: game.trim(),
      genre: selectedGenre,
      result: finalResult,
      stats: finalStats,
      challengeId: selectedChallengeId || undefined,
      isPractice,
      isAi
    })

    if (!res.success) {
      setError(res.error?.message || 'LOGISTIC FAILURE: Data rejected by ledger.')
      setSubmitting(false)
      return
    }

    // Success
    soundEngine.playSuccess()

    setSuccessData({ 
      change: res.mmrChange!, 
      newUsr: res.newUsr!,
      isPromotion: res.isPromotion,
      newTierName: res.newTierName
    })
    
    if (res.isPromotion) {
      soundEngine.playPromotion()
      setShowPromotion(true)
    }

    if (isPractice && res.isPb) {
      toast.success("NEW PERSONAL BEST! Practice makes lethal.", { icon: '🔥', duration: 5000 })
    } else if (isPractice) {
      toast.success("Practice logged. +50 Career XP.", { duration: 4000 })
    }

    // Explicitly update profile for instant UI responsiveness
    setProfile({
      ...profile,
      usr: res.newUsr!,
      mmr: res.newMmr!,
      genre_ratings: {
        ...(profile.genre_ratings || {}),
        [selectedGenre]: {
          rating: res.newMmr!,
          baseline: (GENRES[selectedGenre]?.isHighScore && !profile.genre_ratings?.[selectedGenre]?.baseline)
            ? (finalStats.score || null)
            : (profile.genre_ratings?.[selectedGenre]?.baseline ?? null)
        }
      },
      wins: profile.wins + (result === 'Win' ? 1 : 0),
      losses: profile.losses + (result === 'Loss' ? 1 : 0),
      current_streak: result === 'Win' ? profile.current_streak! + 1 : 0
    })
    setSubmitting(false)
  }

  const handleStatChange = (field: string, value: string) => {
    setStats(prev => ({ ...prev, [field]: value === '' ? undefined : Number(value) }))
  }

  if (successData) {
    if (showPromotion && successData.newTierName) {
      return (
        <PromotionModal 
          newTierName={successData.newTierName} 
          onClose={() => setShowPromotion(false)} 
        />
      )
    }

    return (
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 font-mono">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-steel-950 border-2 border-victory-500 shadow-[0_0_30px_rgba(34,197,94,0.2)] rounded-lg p-8 max-w-md w-full text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-victory-500 to-transparent" />
          
          <div className="w-16 h-16 bg-victory-900/20 border border-victory-500 rounded flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
            <Trophy size={32} className="text-victory-500 animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-bold text-ink-100 mb-2 uppercase tracking-[0.2em]">Match Results Logged</h2>
          <p className="text-ink-400 text-sm mb-8 italic">Combat log successfully committed to the global ledger.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-steel-900 border border-steel-800 p-4">
              <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">GR Delta</p>
              <p className={`text-2xl font-bold ${successData.change >= 0 ? 'text-victory-500' : 'text-threat-500'}`}>
                {successData.change > 0 ? '+' : ''}{successData.change}
              </p>
            </div>
            <div className="bg-steel-900 border border-steel-800 p-4">
              <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Global USR</p>
              <p className="text-2xl text-nexus-400 font-bold">{successData.newUsr}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Button variant="primary" className="w-full" onClick={() => navigate(`/app/profile/${user?.id}`)}>
              RETURN TO COMMAND CENTER
            </Button>
            <button 
              className="text-ink-500 hover:text-ink-300 text-xs transition-colors"
              onClick={() => {
                setSuccessData(null)
                setStep(1)
                setStats({})
                setGame('')
                setFighterGameResults([{ winner: null, playerPerfect: false }])
                setIsPractice(false)
                setIsAi(false)
              }}
            >
              LOG ANOTHER OPERATION
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 lg:p-8 font-mono">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-ink-100 flex items-center justify-center lg:justify-start gap-4">
          <Monitor className="text-nexus-500" /> Combat Record Terminal
        </h2>
        <div className="h-1 w-32 bg-nexus-500 mt-2 mx-auto lg:mx-0 shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Flow & Breadcrumbs */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-4">
            <div className={`p-4 border-l-2 transition-all ${step === 1 ? 'border-nexus-500 bg-nexus-900/10' : 'border-steel-700 opacity-50'}`}>
              <div className="text-[10px] uppercase text-nexus-500 font-bold mb-1">Phase 01</div>
              <div className="text-ink-100 font-bold text-sm">GENRE & TITLE</div>
            </div>
            <div className={`p-4 border-l-2 transition-all ${step === 2 ? 'border-nexus-500 bg-nexus-900/10' : 'border-steel-700 opacity-50'}`}>
              <div className="text-[10px] uppercase text-nexus-500 font-bold mb-1">Phase 02</div>
              <div className="text-ink-100 font-bold text-sm">MATCH STATS</div>
            </div>
          </div>

          <div className="bg-steel-900/50 border border-steel-800 p-4 rounded text-[10px] text-ink-500 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 text-nexus-500"><Activity size={12} /> SYSTEM STATUS: ACTIVE</div>
            <div>VERIFICATION: PHASE 3 MANUAL</div>
            <div className="italic underline underline-offset-4">LOGGING PROTOCOL V4.2.0-ALFA</div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmit} className="bg-steel-950 border border-steel-700 p-8 shadow-2xl relative">
            <div className="absolute top-0 right-0 p-2 text-[10px] text-steel-700">NODE: DL_GS_04</div>
            
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <label className="text-xs uppercase tracking-widest text-ink-500 font-bold">Select Specialization</label>

                    {/* Weekly Challenge Quick Select */}
                    <div 
                      onClick={() => {
                        soundEngine.playTick()
                        if (activeChallenge) {
                          setSelectedGenre(activeChallenge.genre || 'Racing');
                          const title = activeChallenge.target 
                            ? `Weekly Challenge: ${activeChallenge.game} (${activeChallenge.target})`
                            : `Weekly Challenge: ${activeChallenge.game}`;
                          setGame(title);
                          if (activeChallenge.genre === 'Racing' && activeChallenge.target) {
                            setTrackName(activeChallenge.target);
                          }
                          toast.success(`LOADED WEEKLY CHALLENGE: ${activeChallenge.game.toUpperCase()}`);
                        } else {
                          setSelectedGenre('Racing');
                          const currentTrack = getWeeklyChallengeInfo().target;
                          setGame(`Weekly Challenge: ${currentTrack}`);
                          setTrackName(currentTrack);
                          toast.success(`LOADED WEEKLY CHALLENGE: ${currentTrack.toUpperCase()}`);
                        }
                      }}
                      className="p-4 bg-pulse-900/20 border border-pulse-500/30 hover:border-pulse-500/80 rounded mb-4 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-[10px] text-pulse-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <Timer size={12} className="animate-spin-slow" /> Active Weekly Challenge
                        </div>
                        <div className="text-ink-100 font-black text-sm uppercase">
                          {activeChallenge 
                            ? `${activeChallenge.game}${activeChallenge.target ? ` · ${activeChallenge.target}` : ''}`
                            : `Track: ${getWeeklyChallengeInfo().target}`
                          }
                        </div>
                        {activeChallenge?.description && (
                          <div className="text-ink-400 text-[10px] mt-1 normal-case font-body">
                            {activeChallenge.description}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-pulse-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    
                    {/* Active Challenge Shortcut */}
                    {challenges.length > 0 && (
                      <div className="p-3 bg-duel-900/10 border border-duel-500/30 rounded mb-4">
                        <div className="text-[10px] text-duel-500 font-bold mb-2 uppercase">Active Challenge Detected</div>
                        <select 
                          value={selectedChallengeId}
                          onChange={(e) => {
                            const cId = e.target.value;
                            setSelectedChallengeId(cId);
                            const c = challenges.find(x => x.id === cId);
                            if (c) {
                              setGame(c.game);
                              // Auto-select genre if possible
                              if (c.game.toLowerCase().includes('warzone')) setSelectedGenre('Battle Royale');
                            }
                          }}
                          className="w-full bg-steel-950 border border-duel-500/50 text-[10px] p-2 text-ink-300 focus:outline-none"
                        >
                          <option value="">No challenge selected</option>
                          {challenges.map(c => (
                            <option key={c.id} value={c.id}>vs {c.challenger_id === user?.id ? c.opponent_name : c.challenger_name} ({c.game})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.keys(GENRES).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => { soundEngine.playTick(); setSelectedGenre(g) }}
                          className={`p-4 border transition-all flex flex-col items-center gap-2 group ${
                            selectedGenre === g 
                              ? 'bg-nexus-900/20 border-nexus-500 text-nexus-400' 
                              : 'border-steel-800 text-ink-500 hover:border-steel-600'
                          }`}
                        >
                          <div className={`p-2 rounded-full transition-colors ${selectedGenre === g ? 'bg-nexus-500 text-steel-950' : 'bg-steel-900 text-ink-500 group-hover:text-ink-300'}`}>
                            {g === 'Shooter' && <Target size={20} />}
                            {g === 'Battle Royale' && <Activity size={20} />}
                            {g === 'Racing' && <Timer size={20} />}
                            {g === 'Puzzle' && <Cpu size={20} />}
                            {g === 'Fighter' && <Gamepad2 size={20} />}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest">{g}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs uppercase tracking-widest text-ink-500 font-bold">Operation / Title</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="E.G. WARZONE 3.0, APEX, VALORANT"
                        value={game}
                        onChange={e => setGame(e.target.value)}
                        className="w-full bg-steel-900 border border-steel-700 px-4 py-3 text-ink-100 focus:border-nexus-500 focus:outline-none transition-colors italic"
                        list="game-suggestions"
                        required
                      />
                      <datalist id="game-suggestions">
                        {[
                          ...(POPULAR_GAMES_BY_GENRE[selectedGenre] || []),
                          ...Array.from(new Set(history.filter(m => m.genre === selectedGenre).map(m => m.game)))
                            .filter(g => !POPULAR_GAMES_BY_GENRE[selectedGenre]?.includes(g))
                        ]
                        .sort((a, b) => a.localeCompare(b))
                        .map(gameName => (
                          <option key={gameName} value={gameName} />
                        ))}
                      </datalist>
                      <Monitor className="absolute right-4 top-3 text-steel-700" size={18} />
                    </div>
                    
                    {/* Dynamic Popular Games Quick Select */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] uppercase text-ink-500 tracking-widest font-mono">Popular in {selectedGenre}:</span>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_GAMES_BY_GENRE[selectedGenre]?.map(popGame => (
                          <button
                            key={popGame}
                            type="button"
                            onClick={() => setGame(popGame)}
                            className={`text-[10px] uppercase tracking-tighter px-2 py-1 rounded transition-all border ${
                              game === popGame
                                ? 'bg-nexus-900/30 border-nexus-500 text-nexus-400 font-bold'
                                : 'bg-steel-900 border-steel-800 text-ink-500 hover:border-steel-600 hover:text-ink-300'
                            }`}
                          >
                            + {popGame}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recent Submissions Quick Select */}
                    {history.filter(m => m.genre === selectedGenre).length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] uppercase text-ink-500 tracking-widest font-mono">Your Recent in {selectedGenre}:</span>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(history.filter(m => m.genre === selectedGenre).map(m => m.game)))
                            .filter(g => !POPULAR_GAMES_BY_GENRE[selectedGenre]?.includes(g))
                            .slice(0, 3)
                            .map(recentGame => (
                              <button
                                key={recentGame}
                                type="button"
                                onClick={() => setGame(recentGame)}
                                className={`text-[10px] uppercase tracking-tighter px-2 py-1 rounded transition-all border ${
                                  game === recentGame
                                    ? 'bg-nexus-900/30 border-nexus-500 text-nexus-400 font-bold'
                                    : 'bg-steel-900 border-steel-800 text-ink-500 hover:border-steel-600 hover:text-ink-300'
                                }`}
                              >
                                + {recentGame}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    type="button"
                    variant="primary" 
                    className="w-full group"
                    onClick={() => setStep(2)}
                    disabled={!game}
                  >
                    CONTINUE TO MATCH STATS <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {selectedGenre !== 'Racing' && selectedGenre !== 'Fighter' && (
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        type="button"
                        onClick={() => setResult('Win')}
                        className={`p-4 border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                          result === 'Win' 
                            ? 'bg-victory-900/20 border-victory-500 text-victory-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                            : 'border-steel-800 text-ink-500 opacity-50'
                        }`}
                      >
                        <Award size={20} /> <span className="text-xs font-bold">WIN</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setResult('Loss')}
                        className={`p-4 border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                          result === 'Loss' 
                            ? 'bg-threat-900/20 border-threat-500 text-threat-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                            : 'border-steel-800 text-ink-500 opacity-50'
                        }`}
                      >
                        <Skull size={20} /> <span className="text-xs font-bold">LOSS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setResult('Solo')}
                        className={`p-4 border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                          result === 'Solo' 
                            ? 'bg-pulse-900/20 border-pulse-500 text-pulse-400 shadow-[0_0_15px_rgba(0,255,231,0.2)]' 
                            : 'border-steel-800 text-ink-500 opacity-50'
                        }`}
                      >
                        <Cpu size={20} /> <span className="text-xs font-bold whitespace-nowrap">SOLO RECORD</span>
                      </button>
                    </div>
                  )}

                  {selectedGenre === 'Racing' ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase text-ink-500 tracking-widest">Track Name</label>
                        <input 
                          type="text"
                          list="track-suggestions"
                          placeholder="e.g. Maple Valley, Spa, Mount Panorama"
                          value={trackName}
                          onChange={e => setTrackName(e.target.value)}
                          className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors font-bold uppercase"
                          required
                        />
                        <datalist id="track-suggestions">
                          {popularTracks.map(t => <option key={t} value={t} />)}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase text-ink-500 tracking-widest">Lap/Race Time (Minutes : Seconds . Milliseconds)</label>
                        <div className="grid grid-cols-3 gap-4">
                          <input 
                            type="number"
                            placeholder="MM"
                            value={timeMin}
                            onChange={e => setTimeMin(e.target.value)}
                            className="bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors text-center font-bold"
                            min="0"
                            required
                          />
                          <input 
                            type="number"
                            placeholder="SS"
                            value={timeSec}
                            onChange={e => setTimeSec(e.target.value)}
                            className="bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors text-center font-bold"
                            min="0"
                            max="59"
                            required
                          />
                          <input 
                            type="number"
                            placeholder="mmm"
                            value={timeMs}
                            onChange={e => setTimeMs(e.target.value)}
                            className="bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors text-center font-bold"
                            min="0"
                            max="999"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-ink-500 tracking-widest flex justify-between">
                            Car Class <span className="text-steel-600">(Optional)</span>
                          </label>
                          <input 
                            type="text"
                            placeholder="e.g. S1, A, R2"
                            value={carClass}
                            onChange={e => setCarClass(e.target.value)}
                            className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors font-bold uppercase"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-ink-500 tracking-widest flex justify-between">
                            Horsepower <span className="text-steel-600">(Optional)</span>
                          </label>
                          <input 
                            type="number"
                            placeholder="e.g. 725"
                            value={carHp}
                            onChange={e => setCarHp(e.target.value)}
                            className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ) : selectedGenre === 'Fighter' ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-end border-b border-steel-800 pb-4 mb-4">
                        <div className="text-center w-1/2">
                          <span className="text-4xl font-bold text-ink-50 block mb-1">{fighterGameResults.filter(g => g.winner === 'player').length}</span>
                          <label className="text-[10px] text-victory-500 uppercase font-mono tracking-widest font-bold block line-clamp-1 px-2">YOUR WINS</label>
                        </div>
                        <div className="text-center w-1/2">
                          <span className="text-4xl font-bold text-ink-50 block mb-1">{fighterGameResults.filter(g => g.winner === 'opponent').length}</span>
                          <label className="text-[10px] text-threat-500 uppercase font-mono tracking-widest font-bold block line-clamp-1 px-2">OPPONENT WINS</label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {fighterGameResults.map((game, idx) => (
                          <div key={idx} className="bg-steel-950/50 border border-steel-800 rounded-2xl p-4">
                            <div className="text-xs text-ink-500 uppercase font-mono tracking-widest font-bold mb-4 flex justify-between items-center">
                              <span>Game {idx + 1}</span>
                              {fighterGameResults.length > 1 && (
                                <button type="button" onClick={() => setFighterGameResults(fighterGameResults.filter((_, i) => i !== idx))} className="text-ink-500 hover:text-threat-500 transition-colors"><X size={14}/></button>
                              )}
                            </div>
                            <div className="flex gap-4">
                              <div className="flex-1 space-y-3">
                                <Button type="button" size="sm" variant={game.winner === 'player' ? 'primary' : 'ghost'} className={`w-full font-bold uppercase tracking-widest text-[10px] ${game.winner === 'player' ? 'bg-victory-500 text-steel-950 border-victory-500 hover:bg-victory-400' : 'text-ink-400 border-steel-700'}`} onClick={() => { const newResults = [...fighterGameResults]; newResults[idx].winner = 'player'; setFighterGameResults(newResults); }}>I WON</Button>
                                {game.winner === 'player' && (
                                  <label className="flex items-center gap-2 text-[10px] uppercase font-mono font-bold text-ink-400 cursor-pointer justify-center select-none animate-in fade-in">
                                    <input type="checkbox" checked={game.playerPerfect} onChange={e => { const newResults = [...fighterGameResults]; newResults[idx].playerPerfect = e.target.checked; setFighterGameResults(newResults); }} className="rounded border-steel-700 bg-steel-900 text-nexus-500 focus:ring-nexus-500 focus:ring-offset-steel-900 w-3 h-3" />
                                    Perfect Round
                                  </label>
                                )}
                              </div>
                              <div className="flex-1 space-y-3">
                                <Button type="button" size="sm" variant={game.winner === 'opponent' ? 'primary' : 'ghost'} className={`w-full font-bold uppercase tracking-widest text-[10px] ${game.winner === 'opponent' ? 'bg-threat-500 text-white border-threat-500 hover:bg-threat-400' : 'text-ink-400 border-steel-700'}`} onClick={() => { const newResults = [...fighterGameResults]; newResults[idx].winner = 'opponent'; newResults[idx].playerPerfect = false; setFighterGameResults(newResults); }}>THEY WON</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <Button type="button" variant="ghost" className="w-full border border-dashed border-steel-700 text-ink-500 hover:text-ink-200 mt-2 font-mono uppercase text-[10px] tracking-widest py-3" onClick={() => setFighterGameResults([...fighterGameResults, { winner: null, playerPerfect: false }])}>
                        <Plus size={14} className="mr-2" /> Add Next Game
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {genreConfig.statsFields.map(field => (
                        <div key={field} className="space-y-2">
                          <label className="text-[10px] uppercase text-ink-500 tracking-widest">{field.replace('_', ' ')}</label>
                          <input 
                            type="number"
                            placeholder="--"
                            value={stats[field] || ''}
                            onChange={e => handleStatChange(field, e.target.value)}
                            className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors text-right font-bold"
                            min="0"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Party Member Stats */}
                  {partyMembers.length > 0 && selectedGenre !== 'Racing' && selectedGenre !== 'Puzzle' && (
                    <div className="mt-8 border-t border-steel-800 pt-6">
                      <h3 className="text-sm font-display font-black text-nexus-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                        <Users size={16} /> Co-Op Party Record
                      </h3>
                      <div className="space-y-4">
                        {partyMembers.map(member => (
                          <div key={member} className="bg-steel-950 p-4 rounded border border-steel-800">
                            <p className="text-xs font-bold text-ink-100 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-nexus-500 animate-pulse" /> {member}
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                              {['kills', 'deaths', 'assists'].map(field => (
                                <div key={field}>
                                  <label className="text-[9px] uppercase text-ink-500 tracking-widest block mb-1">{field}</label>
                                  <input 
                                    type="number"
                                    placeholder="0"
                                    value={stats.teammates?.find((t: any) => t.name === member)?.[field] || ''}
                                    onChange={e => {
                                      const currentTeammates = stats.teammates || [];
                                      const existingIdx = currentTeammates.findIndex((t: any) => t.name === member);
                                      const newVal = { name: member, ...(existingIdx >= 0 ? currentTeammates[existingIdx] : {}), [field]: e.target.value };
                                      
                                      if (existingIdx >= 0) {
                                        const next = [...currentTeammates];
                                        next[existingIdx] = newVal;
                                        setStats({ ...stats, teammates: next });
                                      } else {
                                        setStats({ ...stats, teammates: [...currentTeammates, newVal] });
                                      }
                                    }}
                                    className="w-full bg-steel-900 border border-steel-700 px-3 py-1.5 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors text-center font-bold"
                                    min="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-threat-900/20 border border-threat-500/50 p-3 text-threat-500 text-[10px] uppercase tracking-widest flex items-center gap-2"
                    >
                      <AlertTriangle size={14} /> ERROR: {error}
                    </motion.div>
                  )}

                  {/* Practice Toggle */}
                  <div className="bg-steel-950/50 p-4 rounded-xl border border-steel-800 flex items-center justify-between mt-4">
                    <div>
                      <h4 className="text-sm font-display font-bold text-ink-100 uppercase tracking-widest">Unranked Practice</h4>
                      <p className="text-[10px] font-mono text-ink-500 uppercase">No MMR risk. Gain Career XP.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { soundEngine.playTick(); setIsPractice(!isPractice); }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isPractice ? 'bg-nexus-500' : 'bg-steel-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isPractice ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* AI Opponent Toggle */}
                  <div className="bg-steel-950/50 p-4 rounded-xl border border-steel-800 flex items-center justify-between mt-4">
                    <div>
                      <h4 className="text-sm font-display font-bold text-ink-100 uppercase tracking-widest">AI Opponent</h4>
                      <p className="text-[10px] font-mono text-ink-500 uppercase">Reduced skill point changes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { soundEngine.playTick(); setIsAi(!isAi); }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isAi ? 'bg-nexus-500' : 'bg-steel-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isAi ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="pt-8 flex gap-4 pt-4 border-t border-steel-800">
                    <button 
                      type="button"
                      className="px-6 py-2 border border-steel-700 text-ink-500 hover:text-ink-100 transition-colors text-xs"
                      onClick={() => setStep(1)}
                    >
                      PREV_PHASE
                    </button>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={submitting || (selectedGenre === 'Fighter' && fighterGameResults.every(g => g.winner === null))}
                      className="flex-1"
                    >
                      COMMIT_TO_LEDGER.exe
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>
    </div>
  )
}
