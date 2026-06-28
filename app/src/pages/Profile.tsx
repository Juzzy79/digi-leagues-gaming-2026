import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProfile, updateProfile } from '../services/profileService'
import type { Profile as ProfileType } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'
import TierBadge from '../components/TierBadge'
import Button from '../components/Button'
import { User, Edit2, Crosshair, Save, X, Camera, Image as ImageIcon, ShieldCheck } from 'lucide-react'
import DogTag from '../components/DogTag'
import { getClaimedDogTags, getNemeses } from '../services/rivalryService'
import { createChallenge } from '../services/challengeService'
import ChallengeModal from '../components/ChallengeModal'
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis 
} from 'recharts'
import { GENRES } from '../services/rankingService'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Swords } from 'lucide-react'
import TrendVisuals from '../components/TrendVisuals'
import AnimatedNumber from '../components/AnimatedNumber'
import { getCareerProgress } from '../services/careerService'
import MedalCase from '../components/MedalCase'
import CareerTimeline from '../components/CareerTimeline'
import SeasonTrack from '../components/SeasonTrack'

// Hardcoded default banner options per the spec
const DEFAULT_BANNERS = [
  'https://images.unsplash.com/photo-1614729939124-032f0b5610ce?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80', // Cyberpunk standard
  'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80', // Racing standard
]

// Special Founder Banner (Exclusive)
const FOUNDER_BANNER_URL = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80' // Symbolic industrial/neon

export default function Profile() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser, profile: myProfile } = useAuth()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [dogTags, setDogTags] = useState<{victimName: string, netScore: number}[]>([])
  const [isNemesis, setIsNemesis] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showChallengeModal, setShowChallengeModal] = useState(false)

  // Edit states
  const [editForm, setEditForm] = useState({
    username: '',
    avatar_url: '',
    banner_url: ''
  })

  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    
    Promise.all([
      getProfile(userId),
      getClaimedDogTags(userId),
      currentUser ? getNemeses(currentUser.id) : Promise.resolve({ data: [] })
    ]).then(([profileRes, tagsRes, nemesesRes]) => {
      if (cancelled) return
      setProfile(profileRes.data)
      setDogTags(tagsRes.data || [])
      
      if (profileRes.data) {
        setEditForm({
          username: profileRes.data.username || '',
          avatar_url: profileRes.data.avatar_url || '',
          banner_url: profileRes.data.banner_url || ''
        })
      }
      
      const amINemesis = nemesesRes.data?.some((n: any) => n.rival_id === userId)
      setIsNemesis(!!amINemesis)
      
      setLoading(false)
    })
    
    return () => { cancelled = true }
  }, [userId, currentUser])

  const handleChallenge = () => {
    if (!profile || !currentUser) return
    setShowChallengeModal(true)
  }

  const handleChallengeConfirm = async (game: string) => {
    setShowChallengeModal(false)
    if (!profile || !currentUser) return
    
    const { success } = await createChallenge({
      challenger_id: currentUser.id,
      challenger_name: myProfile?.username || 'Operator',
      opponent_id: profile.id,
      opponent_name: profile.username,
      game,
      duration_hours: 24,
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    })
    
    if (success) {
      toast.success('CHALLENGE BROADCASTED')
    } else {
      toast.error('FAILED TO TRANSMIT CHALLENGE')
    }
  }

  const handleUpdateProfile = async () => {
    if (!profile || !currentUser) return
    setUpdating(true)
    const { data, error } = await updateProfile(currentUser.id, editForm)
    setUpdating(false)
    
    if (error) {
      toast.error('SYNCHRONIZATION ERROR')
    } else {
      setProfile(data)
      setIsEditMode(false)
      toast.success('DOSSIER UPDATED')
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-nexus-400 font-mono text-sm animate-pulse">FETCHING DOSSIER...</div>
    </div>
  )
  
  if (!profile) return (
    <div className="flex-1 flex flex-col items-center justify-center text-ink-500">
      <h2 className="text-2xl font-display font-bold uppercase">Dossier Not Found</h2>
      <p className="font-mono text-sm mt-2">The specified operator does not exist.</p>
    </div>
  )

  const displayBanner = isEditMode ? editForm.banner_url : (profile.banner_url || DEFAULT_BANNERS[0])
  const career = getCareerProgress(profile.career_xp || 0);

  return (
    <div className="flex-1 w-full p-4 lg:p-8 space-y-6">
      {/* Challenge Modal */}
      {showChallengeModal && profile && (
        <ChallengeModal
          opponentId={profile.id}
          opponentName={profile.username}
          onClose={() => setShowChallengeModal(false)}
        />
      )}
      
      {/* Profile Header Card */}
      <div className="bg-steel-900 border border-steel-600 rounded-lg overflow-hidden relative">
        {/* Banner */}
        <div className="h-48 md:h-64 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-t from-steel-900 via-transparent to-transparent z-10" />
          <img src={displayBanner} alt="Banner" className="w-full h-full object-cover" />
          
          {/* Action Buttons overlay */}
          <div className="absolute top-4 right-4 z-20 flex gap-2 w-full md:w-auto justify-end pr-8 md:pr-0">
            {!isOwnProfile && currentUser && !isNemesis && (
              <Button variant="danger" size="sm" onClick={handleChallenge} className="shadow-lg !bg-duel-500/80 hover:!bg-duel-500 border-none">
                <Crosshair size={14} className="mr-1" /> Issue Challenge
              </Button>
            )}
            {isOwnProfile && (
              <div className="flex gap-2">
                {isEditMode ? (
                  <>
                    <button 
                      onClick={() => setIsEditMode(false)}
                      className="bg-threat-900/80 hover:bg-threat-800 text-threat-400 p-2 rounded border border-threat-600 backdrop-blur transition-colors"
                      title="Cancel Changes"
                    >
                      <X size={16} />
                    </button>
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={updating}
                      className="bg-victory-900/80 hover:bg-victory-800 text-victory-400 p-2 rounded border border-victory-600 backdrop-blur transition-colors disabled:opacity-50"
                      title="Save Dossier"
                    >
                      <Save size={16} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditMode(true)}
                    className="bg-steel-950/80 hover:bg-steel-900 text-ink-300 hover:text-ink-100 p-2 rounded border border-steel-600 backdrop-blur transition-colors"
                    title="Edit Profile"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content (Avatar + Name) */}
        <div className="px-6 pb-6 relative z-20 -mt-16 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          
          {/* Avatar */}
          <div className="w-32 h-32 rounded bg-steel-800 border-4 border-steel-900 flex-shrink-0 overflow-hidden isolate relative shadow-2xl group">
            {isEditMode ? (
              <div className="w-full h-full relative">
                <img 
                  src={editForm.avatar_url || 'https://via.placeholder.com/150'} 
                  className="w-full h-full object-cover opacity-50" 
                  alt="Avatar Preview"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-2 text-center">
                  <Camera size={20} className="text-nexus-400 mb-1" />
                  <input 
                    type="text"
                    value={editForm.avatar_url}
                    onChange={e => setEditForm({ ...editForm, avatar_url: e.target.value })}
                    placeholder="AVATAR_URL"
                    className="w-full bg-steel-900/80 border border-steel-600 rounded text-[8px] font-mono p-1 text-center text-ink-100 outline-none focus:border-nexus-500"
                  />
                </div>
              </div>
            ) : (
              profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-nexus-900 text-nexus-500">
                  <User size={48} />
                </div>
              )
            )}
          </div>

          {/* Info */}
          <div className="flex-1 mb-2 w-full">
            {isEditMode ? (
              <input 
                type="text"
                value={editForm.username}
                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                className="text-2xl font-display font-bold uppercase tracking-widest text-ink-100 bg-steel-900 border border-nexus-400/50 rounded px-3 py-1 w-full max-w-md focus:border-nexus-400 outline-none"
                placeholder="OPERATOR_NAME"
              />
            ) : (
              <h1 className="text-4xl font-display font-bold uppercase tracking-widest text-ink-100 drop-shadow-md">
                {profile.username}
              </h1>
            )}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
              <div className="bg-nexus-900/50 border border-nexus-400 px-3 py-1 rounded flex items-center gap-2 shadow-[0_0_10px_rgba(45,212,191,0.3)]">
                <span className="text-[10px] font-mono text-nexus-400 font-bold uppercase">USR</span>
                <AnimatedNumber value={profile.usr || 1000} className="text-lg font-display font-black text-ink-100 italic tracking-tighter" />
              </div>
              <TierBadge rating={profile.usr || 1000} showRating />
              <div className="flex flex-col gap-1 w-full md:w-64 mt-2 md:mt-0">
                <span className="text-xs font-mono text-ink-300 uppercase tracking-widest bg-steel-800 px-2 py-0.5 rounded border border-steel-700 flex items-center justify-between gap-4">
                  <span><span className="text-ink-500 mr-1">LVL {career.level}</span> {career.rankName}</span>
                  <span className="text-[10px] text-ink-500"><AnimatedNumber value={career.currentXp} /> XP</span>
                </span>
                <div className="w-full h-1 bg-steel-800 rounded overflow-hidden">
                  <div className="h-full bg-nexus-500" style={{ width: `${career.progressPercent}%` }} />
                </div>
              </div>
              {profile.founder_number && profile.founder_number <= 50 && (
                <span className="text-[10px] font-mono text-yellow-500 bg-yellow-950/20 border border-yellow-500/30 px-2 py-0.5 rounded uppercase font-bold tracking-tighter flex items-center gap-1">
                  <ShieldCheck size={10} /> Founder #{profile.founder_number}
                </span>
              )}
            </div>
          </div>
          
          {/* Stats quick strip (desktop) */}
          <div className="hidden md:flex gap-6 mb-2">
            <div>
              <p className="text-[10px] text-ink-500 font-mono uppercase tracking-widest">Wins</p>
              <p className="text-xl font-mono text-victory-500 font-bold">{profile.wins}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 font-mono uppercase tracking-widest">Losses</p>
              <p className="text-xl font-mono text-threat-500 font-bold">{profile.losses}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 font-mono uppercase tracking-widest">Win Rate</p>
              <p className="text-xl font-mono text-nexus-400 font-bold">{profile.win_rate}%</p>
            </div>
          </div>

          {currentUser?.id && userId !== currentUser.id && (
            <div className="absolute top-4 right-4 z-30">
              <Link 
                to={`/app/versus/${userId}`}
                className="bg-threat-900/80 border border-threat-500 text-threat-400 hover:bg-threat-500 hover:text-white px-4 py-2 rounded text-xs font-display font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <Swords size={16} /> Head-to-Head
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Banner Selection (Edit Mode only) */}
      {isEditMode && (
        <div className="bg-steel-950 border border-nexus-500/30 rounded-lg p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-6">
            <ImageIcon className="text-nexus-400" size={18} />
            <h3 className="text-xs font-display font-bold uppercase text-ink-100 tracking-widest">Select Banner Environment</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {DEFAULT_BANNERS.map((banner, i) => (
              <button 
                key={i}
                type="button"
                onClick={() => setEditForm(prev => ({ ...prev, banner_url: banner }))}
                className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                  editForm.banner_url === banner ? 'border-nexus-400 scale-105 shadow-[0_0_15px_rgba(45,212,191,0.4)]' : 'border-steel-700 hover:border-steel-500'
                }`}
              >
                <img src={banner} className="w-full h-full object-cover" alt={`Banner Option ${i}`} />
                {editForm.banner_url === banner && (
                  <div className="absolute inset-0 bg-nexus-500/10 flex items-center justify-center">
                    <ShieldCheck className="text-nexus-400" size={24} />
                  </div>
                )}
              </button>
            ))}
            
            {/* Founder Exclusive Slot */}
            <div className="relative group">
              {(profile.founder_number && profile.founder_number <= 50) ? (
                <button 
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, banner_url: FOUNDER_BANNER_URL }))}
                  className={`relative aspect-video w-full rounded overflow-hidden border-2 transition-all bg-steel-900 ${
                    editForm.banner_url === FOUNDER_BANNER_URL ? 'border-yellow-500 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'border-yellow-900/50 hover:border-yellow-600/50'
                  }`}
                >
                  <img src={FOUNDER_BANNER_URL} className="w-full h-full object-cover" alt="Founder Exclusive" />
                  <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/80 to-transparent flex items-end justify-center pb-2">
                    <span className="text-[8px] font-black uppercase text-yellow-500 tracking-[0.2em] drop-shadow-md">Founder Exclusive</span>
                  </div>
                  {editForm.banner_url === FOUNDER_BANNER_URL && (
                    <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center">
                      <ShieldCheck className="text-yellow-500" size={24} />
                    </div>
                  )}
                </button>
              ) : (
                <div className="aspect-video w-full rounded border-2 border-steel-800 bg-steel-900/50 flex flex-col items-center justify-center text-ink-800 cursor-not-allowed grayscale">
                  <ShieldCheck size={20} className="mb-1 opacity-20" />
                  <span className="text-[7px] font-black uppercase tracking-widest text-center px-2 opacity-50">Locked: Founder 50 Req.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Gamer DNA & Tags */}
        <div className="lg:col-span-5 space-y-6">
          {/* Gamer DNA Chart */}
          <div className="bg-steel-950 border border-steel-700 rounded-lg p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-display font-bold uppercase text-nexus-400 tracking-widest">Gamer DNA</h3>
              <div className="flex items-center gap-2 text-[10px] text-ink-500 font-mono">
                <div className="w-2 h-2 rounded-full bg-nexus-500" /> NORMALIZED_PERFORMANCE
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart 
                  cx="50%" 
                  cy="50%" 
                  outerRadius="80%" 
                  data={Object.keys(GENRES).map(g => ({
                    subject: g,
                    A: profile.genre_ratings?.[g]?.rating || 1000,
                    fullMark: 2500
                  }))}
                >
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 2500]} 
                    tick={false} 
                    axisLine={false} 
                  />
                  <Radar
                    name="Skill"
                    dataKey="A"
                    stroke="#2dd4bf"
                    fill="#2dd4bf"
                    fillOpacity={0.2}
                    isAnimationActive={true}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono text-ink-500">
              {Object.keys(GENRES).slice(0, 4).map(g => (
                <div key={g} className="flex justify-between items-center bg-steel-900 p-2 border border-steel-800">
                  <span className="uppercase">{g}</span>
                  <span className="text-nexus-400">{profile.genre_ratings?.[g]?.rating || 1000}</span>
                </div>
              ))}
            </div>
          </div>

          <TrendVisuals userId={profile.id} />

          {/* Skill Rating Audit */}
          <div className="bg-steel-950 border border-steel-700 rounded-lg p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-xs font-display font-bold uppercase text-nexus-400 tracking-widest border-b border-steel-800/80 pb-3">
              Skill Rating Audit Ledger
            </h3>
            
            <div className="space-y-3 font-mono text-xs text-ink-400">
              <div className="flex justify-between border-b border-steel-900 pb-2">
                <span>Active Disciplines:</span>
                <span className="text-ink-100 font-bold">{Object.keys(profile.genre_ratings || {}).length || 0}</span>
              </div>
              
              {Object.keys(profile.genre_ratings || {}).length > 0 ? (
                <>
                  <div className="space-y-1 pl-3 border-l border-steel-800">
                    {Object.entries(profile.genre_ratings || {}).map(([genre, data]: [string, any]) => (
                      <div key={genre} className="flex justify-between text-[11px]">
                        <span className="text-ink-500">{genre}:</span>
                        <span className="text-ink-300 font-bold">{data?.rating || 1000} GR (Genre Rating)</span>
                      </div>
                    ))}
                  </div>
                  
                  {(() => {
                    const ratings = Object.values(profile.genre_ratings || {}).map((d: any) => d.rating || 1000);
                    const sorted = [...ratings].sort((a, b) => b - a);
                    const top3 = sorted.slice(0, 3);
                    const avgTop3 = top3.reduce((a, b) => a + b, 0) / top3.length;
                    const avgAll = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                    
                    const weightedTop3 = avgTop3 * 0.7;
                    const weightedAll = avgAll * 0.3;
                    const finalUsr = Math.round(weightedTop3 + weightedAll);

                    return (
                      <div className="space-y-3 pt-3 border-t border-steel-900">
                        <div className="bg-steel-900/80 p-2.5 rounded border border-steel-800 space-y-1.5 text-[11px]">
                          <div className="text-[10px] text-ink-500 uppercase tracking-wider font-bold">Calculation Breakdown</div>
                          
                          <div className="flex justify-between text-ink-400">
                            <span>Top {top3.length} Genre Avg:</span>
                            <span>{avgTop3.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between text-ink-500 pl-2">
                            <span>70% Weight:</span>
                            <span>{weightedTop3.toFixed(1)}</span>
                          </div>

                          <div className="border-b border-steel-800/50 my-1" />

                          <div className="flex justify-between text-ink-400">
                            <span>All Genres Avg:</span>
                            <span>{avgAll.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between text-ink-500 pl-2">
                            <span>30% Weight:</span>
                            <span>{weightedAll.toFixed(1)}</span>
                          </div>
                          
                          <div className="border-b border-steel-800/50 my-1" />

                          <div className="flex justify-between text-ink-300 font-mono">
                            <span>Formula:</span>
                            <span className="text-[10px] text-nexus-500">{`(${avgTop3.toFixed(0)} × 0.7) + (${avgAll.toFixed(0)} × 0.3)`}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-nexus-450 font-bold pt-2 border-t border-dashed border-steel-850">
                          <span className="uppercase text-[10px] tracking-wider">Universal Skill Rating (USR)</span>
                          <span className="text-lg text-nexus-400 font-black italic">{finalUsr}</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="text-[10px] text-ink-600 italic">No discipline data recorded.</div>
              )}
            </div>
            
            <div className="bg-steel-900/50 p-3 rounded border border-steel-800/80 text-[10px] text-ink-500 leading-relaxed font-body space-y-2">
              <p>
                <strong>LOGISTIC PROTOCOL:</strong> Your USR combines all games. Gaining points in a secondary game increases that game's **Genre Rating (GR)**.
              </p>
              <p className="text-pulse-400 border-t border-steel-800/50 pt-2">
                ⚠️ <strong>Averaging Effect:</strong> If a newly added genre rating (like starting Racing at 1200 + 15 = 1215) is lower than your established primary rating (like Shooter at 1301), adding it will pull your average down and cause your overall USR to decrease. Raising the ratings of all disciplines will recover and boost your USR.
              </p>
            </div>
          </div>

          {/* Dog Tags & Nemesis Display */}
          {(isNemesis || dogTags.length > 0) && (
            <div className="bg-steel-900 border border-steel-600 rounded-lg p-6">
              {isNemesis && (
                <div className="bg-threat-900/20 border border-threat-500/50 text-threat-500 rounded p-3 mb-6 flex items-center gap-3 animate-pulse">
                  <Crosshair size={20} className="flex-shrink-0" />
                  <div>
                    <strong className="font-display uppercase tracking-wider block text-xs">Nemesis Identified</strong>
                    <span className="text-[10px] font-body font-medium text-threat-400">Restricting profile access...</span>
                  </div>
                </div>
              )}
              
              {dogTags.length > 0 && (
                <div>
                  <h3 className="text-xs font-display font-bold uppercase text-ink-300 tracking-widest mb-4">Claimed Dog Tags</h3>
                  <div className="flex flex-wrap gap-3">
                    {dogTags.map((tag, i) => (
                      <DogTag key={i} victimName={tag.victimName} netScore={tag.netScore} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Medal Case */}
          <MedalCase userId={userId || ''} />
        </div>

        {/* Right Column: History & Stats */}
        <div className="lg:col-span-7 space-y-6">
          <SeasonTrack circuitPoints={profile.circuit_points || 0} />
          <CareerTimeline userId={userId || ''} />
        </div>
      </div>
    </div>
  )
}
