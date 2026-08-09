import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { submitMatch, getMatchHistory, getUniqueTracksForGame } from '../services/matchService'
import { getAcceptedChallenges } from '../services/challengeService'
import type { Challenge } from '../services/challengeService'
import { GENRES } from '../services/rankingService'
import Button from '../components/Button'
import { 
  Trophy, AlertTriangle, Skull, 
  Monitor, Cpu, Activity,
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
  
  // Game Selection State
  const [gameSelection, setGameSelection] = useState<string>('')
  const [isNewGame, setIsNewGame] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<string>('Shooter')
  const [game, setGame] = useState('')
  
  // Match Stats State
  const [result, setResult] = useState<'Win' | 'Loss' | 'Solo'>('Win')
  const [isPractice, setIsPractice] = useState(false)
  const [isAi, setIsAi] = useState(false)
  const [stats, setStats] = useState<Record<string, any>>({})
  const [history, setHistory] = useState<any[]>([])
  
  // Custom Time Trial / Racing Stats States
  const [racingType, setRacingType] = useState<'Lap'|'Race'>('Lap')
  const [trackName, setTrackName] = useState('')
  const [timeMin, setTimeMin] = useState('')
  const [timeSec, setTimeSec] = useState('')
  const [timeMs, setTimeMs] = useState('')
  const [bestLapMin, setBestLapMin] = useState('')
  const [bestLapSec, setBestLapSec] = useState('')
  const [bestLapMs, setBestLapMs] = useState('')
  const [popularTracks, setPopularTracks] = useState<string[]>([])
  const [carName, setCarName] = useState('')
  const [carClass, setCarClass] = useState('')
  const [carHp, setCarHp] = useState('')
  
  // Rival Encounter State
  const [rivalName, setRivalName] = useState('')
  const [killsOnRival, setKillsOnRival] = useState('')
  const [deathsToRival, setDeathsToRival] = useState('')
  
  // Challenges & Fighter States
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallengeId, setSelectedChallengeId] = useState('')
  const [fighterGameResults, setFighterGameResults] = useState<{winner: 'player'|'opponent'|null, playerPerfect: boolean}[]>([{ winner: null, playerPerfect: false }]);
  
  // Submission States
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

  // Build the dynamic dropdown list
  const gameOptions = useMemo(() => {
    return Object.keys(GENRES).map(genre => {
      const popular = POPULAR_GAMES_BY_GENRE[genre] || [];
      const past = history.filter(m => m.genre === genre).map(m => m.game);
      const unique = Array.from(new Set([...popular, ...past])).sort((a, b) => a.localeCompare(b));
      return { genre, games: unique };
    });
  }, [history]);

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
        car_name: carName || undefined,
        car_class: carClass || undefined,
        car_hp: carHp ? parseFloat(carHp) : undefined
      };
      if (racingType === 'Lap') {
        finalStats.best_lap = totalSec;
      } else {
        finalStats.total_time = totalSec;
        const bMin = parseFloat(bestLapMin) || 0;
        const bSec = parseFloat(bestLapSec) || 0;
        const bMs = parseFloat(bestLapMs) || 0;
        if (bMin > 0 || bSec > 0 || bMs > 0) {
          finalStats.best_lap = bMin * 60 + bSec + bMs / 1000;
        }
      }
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

    if (rivalName.trim()) {
      finalStats.rival = {
        name: rivalName.trim(),
        kills_on_rival: parseInt(killsOnRival) || 0,
        deaths_to_rival: parseInt(deathsToRival) || 0
      }
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

  const resetForm = () => {
    setSuccessData(null)
    setStats({})
    setGame('')
    setGameSelection('')
    setIsNewGame(false)
    setFighterGameResults([{ winner: null, playerPerfect: false }])
    setIsPractice(false)
    setIsAi(false)
    setTrackName('')
    setTimeMin('')
    setTimeSec('')
    setTimeMs('')
    setBestLapMin('')
    setBestLapSec('')
    setBestLapMs('')
    setCarName('')
    setCarClass('')
    setCarHp('')
    setRivalName('')
    setKillsOnRival('')
    setDeathsToRival('')
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
              onClick={resetForm}
            >
              LOG ANOTHER OPERATION
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full p-4 lg:p-8 font-mono">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-ink-100 flex items-center justify-center gap-4">
          <Monitor className="text-nexus-500" /> Combat Terminal
        </h2>
        <div className="h-1 w-32 bg-nexus-500 mt-2 mx-auto shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
      </div>

      <div className="mb-8 p-5 bg-steel-900/40 border border-steel-800 rounded-2xl text-center">
        <p className="text-xs text-ink-400 leading-relaxed font-sans uppercase tracking-wider">
           💡 <span className="font-bold text-nexus-400">Play Anything, Log Everything:</span> You can submit scores for a variety of games, even if they aren't listed here! Select <span className="font-bold text-pulse-400 font-mono">"+ ADD NEW GAME..."</span> below to enter any game you are currently playing to build up your rank, career progression, and skill points.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-steel-950 border border-steel-700 p-6 lg:p-8 shadow-2xl relative space-y-8">
        <div className="absolute top-0 right-0 p-2 text-[10px] text-steel-700">NODE: DL_GS_04</div>
        
        {/* Weekly Challenge Quick Select */}
        <div 
          onClick={() => {
            soundEngine.playTick()
            if (activeChallenge) {
              setSelectedGenre(activeChallenge.genre || 'Racing');
              setGame(activeChallenge.game);
              setGameSelection(activeChallenge.game);
              setIsNewGame(false);
              if (activeChallenge.genre === 'Racing' && activeChallenge.target) {
                setTrackName(activeChallenge.target);
              }
              toast.success(`LOADED WEEKLY CHALLENGE: ${activeChallenge.game.toUpperCase()}`);
            } else {
              setSelectedGenre('Racing');
              const currentTrack = getWeeklyChallengeInfo().target;
              setGame('Forza Horizon 6');
              setGameSelection('Forza Horizon 6');
              setIsNewGame(false);
              setTrackName(currentTrack);
              toast.success(`LOADED WEEKLY CHALLENGE: ${currentTrack.toUpperCase()}`);
            }
          }}
          className="p-4 bg-pulse-900/20 border border-pulse-500/30 hover:border-pulse-500/80 rounded cursor-pointer transition-all flex items-center justify-between group"
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
          </div>
        </div>

        {/* Active Challenge Shortcut */}
        {challenges.length > 0 && (
          <div className="p-3 bg-duel-900/10 border border-duel-500/30 rounded">
            <div className="text-[10px] text-duel-500 font-bold mb-2 uppercase">Active Duel Detected</div>
            <select 
              value={selectedChallengeId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedChallengeId(cId);
                const c = challenges.find(x => x.id === cId);
                if (c) {
                  setGame(c.game);
                  setGameSelection(c.game);
                  setIsNewGame(false);
                  if (c.game.toLowerCase().includes('warzone')) setSelectedGenre('Battle Royale');
                }
              }}
              className="w-full bg-steel-950 border border-duel-500/50 text-xs p-2 text-ink-300 focus:outline-none"
            >
              <option value="">No challenge selected</option>
              {challenges.map(c => (
                <option key={c.id} value={c.id}>vs {c.challenger_id === user?.id ? c.opponent_name : c.challenger_name} ({c.game})</option>
              ))}
            </select>
          </div>
        )}

        {/* Game Selection */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest text-ink-500 font-bold">Operation / Game</label>
          <select
            value={isNewGame ? 'NEW' : gameSelection}
            onChange={e => {
              const val = e.target.value;
              soundEngine.playTick();
              if (val === 'NEW') {
                setIsNewGame(true);
                setGame('');
                setSelectedGenre('Shooter'); // Default
              } else {
                setIsNewGame(false);
                setGame(val);
                setGameSelection(val);
                // Auto-detect genre
                const gObj = gameOptions.find(g => g.games.includes(val));
                if (gObj) setSelectedGenre(gObj.genre);
              }
            }}
            className="w-full bg-steel-900 border border-steel-700 px-4 py-3 text-ink-100 focus:border-nexus-500 focus:outline-none transition-colors"
            required
          >
            <option value="" disabled>Select a Game...</option>
            {gameOptions.map(g => (
              <optgroup key={g.genre} label={g.genre.toUpperCase()}>
                {g.games.map(gameName => (
                  <option key={gameName} value={gameName}>{gameName}</option>
                ))}
              </optgroup>
            ))}
            <option value="NEW">+ ADD NEW GAME...</option>
          </select>
        </div>

        {/* New Game Inputs */}
        {isNewGame && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2 border-t border-steel-800"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(GENRES).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { soundEngine.playTick(); setSelectedGenre(g) }}
                    className={`p-3 border transition-all flex items-center justify-center gap-2 group ${
                      selectedGenre === g 
                        ? 'bg-nexus-900/20 border-nexus-500 text-nexus-400' 
                        : 'border-steel-800 text-ink-500 hover:border-steel-600'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest">{g}</span>
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="ENTER NEW GAME TITLE..."
                value={game}
                onChange={e => setGame(e.target.value)}
                className="w-full bg-steel-900 border border-steel-700 px-4 py-3 text-ink-100 focus:border-nexus-500 focus:outline-none transition-colors uppercase font-bold"
                required
              />
            </motion.div>
          </AnimatePresence>
        )}

        {/* Stats Section (only show if a game is selected) */}
        {game && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pt-8 border-t border-steel-800"
            >
              {/* Win/Loss/Solo Selector */}
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
                    <Cpu size={20} /> <span className="text-xs font-bold whitespace-nowrap">SOLO</span>
                  </button>
                </div>
              )}

              {selectedGenre === 'Racing' ? (
                <div className="space-y-6">
                  {/* Record Type Toggle */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-ink-500 tracking-widest font-bold">Record Type</label>
                    <div className="flex gap-4">
                      <button 
                        type="button" 
                        onClick={() => { soundEngine.playTick(); setRacingType('Lap') }} 
                        className={`flex-1 py-3 border text-xs font-bold uppercase transition-all ${racingType === 'Lap' ? 'bg-nexus-900/30 border-nexus-500 text-nexus-400 shadow-[0_0_15px_rgba(45,212,191,0.2)]' : 'border-steel-800 text-ink-500 hover:border-steel-600'}`}
                      >
                        Single Lap
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { soundEngine.playTick(); setRacingType('Race') }} 
                        className={`flex-1 py-3 border text-xs font-bold uppercase transition-all ${racingType === 'Race' ? 'bg-nexus-900/30 border-nexus-500 text-nexus-400 shadow-[0_0_15px_rgba(45,212,191,0.2)]' : 'border-steel-800 text-ink-500 hover:border-steel-600'}`}
                      >
                        Full Race
                      </button>
                    </div>
                  </div>

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
                    <label className="text-[10px] uppercase text-ink-500 tracking-widest">{racingType === 'Lap' ? 'Lap Time' : 'Total Race Time'} (Minutes : Seconds . Milliseconds)</label>
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

                  {racingType === 'Race' && (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-ink-500 tracking-widest flex justify-between">
                        Best Lap Time <span className="text-steel-600">(Optional)</span>
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        <input 
                          type="number"
                          placeholder="MM"
                          value={bestLapMin}
                          onChange={e => setBestLapMin(e.target.value)}
                          className="bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors text-center font-bold"
                          min="0"
                        />
                        <input 
                          type="number"
                          placeholder="SS"
                          value={bestLapSec}
                          onChange={e => setBestLapSec(e.target.value)}
                          className="bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors text-center font-bold"
                          min="0"
                          max="59"
                        />
                        <input 
                          type="number"
                          placeholder="mmm"
                          value={bestLapMs}
                          onChange={e => setBestLapMs(e.target.value)}
                          className="bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors text-center font-bold"
                          min="0"
                          max="999"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-ink-500 tracking-widest flex justify-between">
                      Vehicle / Car Name <span className="text-steel-600">(Opt)</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Porsche 911 GT3 RS"
                      value={carName}
                      onChange={e => setCarName(e.target.value)}
                      className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors font-bold uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-ink-500 tracking-widest flex justify-between">
                        Car Class <span className="text-steel-600">(Opt)</span>
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
                        Horsepower <span className="text-steel-600">(Opt)</span>
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

              {/* Rival Encounter */}
              <div className="mt-8 border-t border-steel-800 pt-6">
                <h3 className="text-sm font-display font-black text-threat-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                  <Skull size={16} /> Rival Encounter <span className="text-[10px] text-steel-600">(Optional)</span>
                </h3>
                <div className="bg-steel-950 p-4 rounded border border-steel-800 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-ink-500 tracking-widest block mb-1">Rival Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. xX_Sniper_Xx"
                      value={rivalName}
                      onChange={e => setRivalName(e.target.value)}
                      className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-threat-400 focus:border-threat-500 focus:outline-none transition-colors font-bold"
                    />
                  </div>
                  {rivalName && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase text-ink-500 tracking-widest block mb-1">Your Kills on Rival</label>
                        <input 
                          type="number"
                          placeholder="0"
                          value={killsOnRival}
                          onChange={e => setKillsOnRival(e.target.value)}
                          className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-threat-400 focus:border-threat-500 focus:outline-none transition-colors font-bold"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-ink-500 tracking-widest block mb-1">Rival Kills on You</label>
                        <input 
                          type="number"
                          placeholder="0"
                          value={deathsToRival}
                          onChange={e => setDeathsToRival(e.target.value)}
                          className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-threat-400 focus:border-threat-500 focus:outline-none transition-colors font-bold"
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-threat-900/20 border border-threat-500/50 p-3 text-threat-500 text-[10px] uppercase tracking-widest flex items-center gap-2"
                >
                  <AlertTriangle size={14} /> ERROR: {error}
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-steel-800">
                {/* Practice Toggle */}
                <div className="bg-steel-950/50 p-4 rounded border border-steel-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-display font-bold text-ink-100 uppercase tracking-widest">Unranked Practice</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => { soundEngine.playTick(); setIsPractice(!isPractice); }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isPractice ? 'bg-nexus-500' : 'bg-steel-700'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${isPractice ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AI Opponent Toggle */}
                <div className="bg-steel-950/50 p-4 rounded border border-steel-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-display font-bold text-ink-100 uppercase tracking-widest">AI Opponent</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => { soundEngine.playTick(); setIsAi(!isAi); }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isAi ? 'bg-nexus-500' : 'bg-steel-700'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${isAi ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                variant="primary" 
                disabled={submitting || (selectedGenre === 'Fighter' && fighterGameResults.every(g => g.winner === null))}
                className="w-full py-4 text-sm"
              >
                COMMIT_TO_LEDGER.exe
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </form>
    </div>
  )
}
