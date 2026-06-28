
import React, { useRef, useState, useEffect } from 'react';
import { Calendar, Users, Shield, Plus, X, Trophy, Grid, List, GitMerge, CheckCircle2, Star, Award, Crown, Globe, Play, Edit3, Trash2, Camera, Upload, Check, ChevronLeft, LayoutGrid, Layers } from 'lucide-react';
import { Button } from '../components/Button';
import { Tournament, TournamentStatus, GameType, TournamentFormat, TournamentTier, TournamentMatch, MatchStatus, Registration, FFAMatchParticipant, PlayoffFormat, SeriesLength, User, Circuit } from '../types';
import { calculateStandings } from '../services/tournamentService';

interface TournamentsProps {
  tournaments: Tournament[];
  circuits: Circuit[];
  currentUser: User;
  onCreateTournament: (t: Omit<Tournament, 'id' | 'status' | 'participants' | 'imageUrl' | 'registrations' | 'matches'>) => void;
  onEditTournament: (id: string, updates: Partial<Tournament>) => void;
  onDeleteTournament: (id: string) => void;
  onRegister: (tournamentId: string, name: string) => void;
  onStartTournament: (tournamentId: string) => void;
  onReportMatch: (tournamentId: string, matchId: string, s1: number, s2: number, winnerId: string, ffaResults?: FFAMatchParticipant[], p1Stats?: any, p2Stats?: any) => void;
}

const DynamicMatchCard: React.FC<{ match: TournamentMatch; onReport: (m: TournamentMatch) => void; }> = ({ match, onReport }) => {
  const isCompleted = match?.status === MatchStatus.COMPLETED;
  const isScheduled = match?.status === MatchStatus.SCHEDULED;
  
  if (match?.isFFA) {
    return (
      <div className={`relative bg-carbon-800 border ${isCompleted ? 'border-carbon-700' : 'border-forest-500/30 shadow-lg shadow-forest-500/5'} rounded overflow-hidden w-56 shrink-0 transition-all p-3 flex flex-col justify-between h-32`}>
        <div className="absolute top-0 right-0 bg-carbon-900 text-[9px] px-2 py-0.5 text-ash-500 rounded-bl">
           {match?.groupName}
        </div>
        <div>
           <div className="text-[10px] text-ash-500 uppercase font-bold mb-1">
              Round {match?.round} - FFA
           </div>
           <div className="text-sm font-bold text-white mb-2">
              {match?.groupName} Matchup
           </div>
           <div className="text-xs text-ash-400">
              <Users size={12} className="inline mr-1" />
              {match?.ffaParticipants?.length || 0} Players
           </div>
        </div>
        <div className="flex justify-between items-center mt-2 border-t border-carbon-700 pt-2">
           <span className={`text-xs font-bold uppercase ${isCompleted ? 'text-forest-500' : 'text-ash-500'}`}>
              {isCompleted ? 'Completed' : 'Scheduled'}
           </span>
           {isScheduled && (
             <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => onReport(match)}>
                Report
             </Button>
           )}
        </div>
      </div>
    );
  }

  const winnerIdx = match?.winnerId === match?.player1Id ? 0 : match?.winnerId === match?.player2Id ? 1 : -1;
  return (
    <div className={`relative bg-carbon-800 border ${isCompleted ? 'border-carbon-700' : 'border-forest-500/30 shadow-lg shadow-forest-500/5'} rounded overflow-hidden w-56 shrink-0 transition-all`}>
      <div className="absolute -top-5 left-0 text-[10px] text-ash-500 uppercase font-bold">
         {match?.round === 1 ? 'Round 1' : match?.round === 2 ? 'Semi Final' : match?.round === 3 ? 'Final' : `Round ${match?.round}`}
      </div>
      <div className={`flex justify-between items-center px-3 py-2 border-b border-carbon-700/50 ${winnerIdx === 0 ? 'bg-forest-900/20' : ''}`}>
         <span className={`text-sm truncate max-w-[70%] ${winnerIdx === 0 ? 'text-forest-400 font-bold' : 'text-ash-300'}`}>{match?.player1Name || 'TBD'}</span>
         <span className="font-mono text-xs text-ash-500">{isCompleted ? match?.score1 : '-'}</span>
      </div>
      <div className={`flex justify-between items-center px-3 py-2 ${winnerIdx === 1 ? 'bg-forest-900/20' : ''}`}>
         <span className={`text-sm truncate max-w-[70%] ${winnerIdx === 1 ? 'text-forest-400 font-bold' : 'text-ash-300'}`}>{match?.player2Name || 'TBD'}</span>
         <span className="font-mono text-xs text-ash-500">{isCompleted ? match?.score2 : '-'}</span>
      </div>
      {isScheduled && (
         <button onClick={() => onReport(match)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-carbon-700 hover:bg-forest-600 text-ash-400 hover:text-white p-1.5 rounded-full transition-colors shadow-lg">
            <Edit3 size={12} />
         </button>
      )}
    </div>
  );
};

const DynamicBracket: React.FC<{ matches: TournamentMatch[]; onReport: (m: TournamentMatch) => void; }> = ({ matches = [], onReport }) => {
   const rounds = (matches || []).reduce((acc, m) => {
      acc[m.round] = acc[m.round] || [];
      acc[m.round].push(m);
      return acc;
   }, {} as Record<number, TournamentMatch[]>);
   const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
   return (
      <div className="overflow-x-auto p-4 md:p-8 touch-auto">
         <div className="flex gap-8 md:gap-12 min-w-max items-center">
            {roundNumbers.map(r => (
               <div key={r} className="flex flex-col justify-around gap-8">
                  {rounds[r].map(m => (
                     <DynamicMatchCard key={m.id} match={m} onReport={onReport} />
                  ))}
               </div>
            ))}
         </div>
      </div>
   );
};

const DynamicLeagueTable: React.FC<{ registrations: Registration[]; matches: TournamentMatch[]; }> = ({ registrations = [], matches = [] }) => {
  const standings = calculateStandings(registrations, matches);
  const pools = (standings || []).reduce((acc, curr) => {
    const poolName = curr?.groupName || 'General';
    if (!acc[poolName]) acc[poolName] = [];
    acc[poolName].push(curr);
    return acc;
  }, {} as Record<string, typeof standings>);
  return (
    <div className="space-y-8">
       {Object.entries(pools).map(([poolName, poolStandings]) => (
          <div key={poolName} className="overflow-hidden rounded-lg border border-carbon-700">
            {poolName !== 'General' && (
               <div className="bg-carbon-800 px-6 py-2 font-bold text-forest-400 uppercase text-xs border-b border-carbon-700">
                  {poolName} Standings
               </div>
            )}
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left whitespace-nowrap">
                 <thead className="text-xs text-ash-500 uppercase bg-carbon-800 border-b border-carbon-700">
                   <tr>
                     <th className="px-4 md:px-6 py-3">Rank</th>
                     <th className="px-4 md:px-6 py-3">Player/Team</th>
                     <th className="px-4 md:px-6 py-3 text-center">Played</th>
                     <th className="px-4 md:px-6 py-3 text-center">W - L</th>
                     <th className="px-4 md:px-6 py-3 text-right">Diff / Score</th>
                     <th className="px-4 md:px-6 py-3 text-right">Points</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-carbon-700 bg-carbon-900">
                   {poolStandings.map((row, index) => (
                     <tr key={row?.id} className="hover:bg-carbon-800 transition-colors">
                       <td className="px-4 md:px-6 py-4 font-medium text-white">{index === 0 ? <span className="text-yellow-500">#{index + 1}</span> : `#${index + 1}`}</td>
                       <td className="px-4 md:px-6 py-4 text-ash-100 font-medium">{row?.name}</td>
                       <td className="px-4 md:px-6 py-4 text-center text-ash-500">{row?.played}</td>
                       <td className="px-4 md:px-6 py-4 text-center text-ash-300">
                         <span className="text-forest-500">{row?.wins}</span> - <span className="text-red-500">{row?.losses}</span>
                       </td>
                       <td className="px-4 md:px-6 py-4 text-right text-ash-500">{row?.scoreDiff > 0 ? `+${row?.scoreDiff}` : row?.scoreDiff}</td>
                       <td className="px-4 md:px-6 py-4 text-right font-bold text-forest-400">{row?.points}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
       ))}
    </div>
  );
};

const DynamicSchedule: React.FC<{ matches: TournamentMatch[]; onReport: (m: TournamentMatch) => void; }> = ({ matches = [], onReport }) => {
  return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(matches || []).map(m => {
           const isCompleted = m?.status === MatchStatus.COMPLETED;
           if (m?.isFFA) {
              return (
                 <div key={m?.id} className={`bg-carbon-800 border ${isCompleted ? 'border-carbon-700 opacity-70' : 'border-carbon-600'} rounded p-4 flex flex-col gap-3`}>
                    <div className="flex justify-between items-center">
                       <span className="text-forest-500 font-bold text-sm">{m?.groupName}</span>
                       <span className="text-ash-500 text-xs uppercase">Round {m?.round}</span>
                    </div>
                    <div className="text-white text-sm font-bold">FFA Match ({m?.ffaParticipants?.length} Players)</div>
                    {m?.status === MatchStatus.SCHEDULED && <Button size="sm" variant="outline" onClick={() => onReport(m)} className="w-full">Report Results</Button>}
                    {isCompleted && <span className="text-xs text-forest-500 flex items-center gap-1"><CheckCircle2 size={12}/> Completed</span>}
                 </div>
              );
           }
           return (
             <div key={m?.id} className={`bg-carbon-800 border ${isCompleted ? 'border-carbon-700 opacity-70' : 'border-carbon-600'} rounded p-3 flex justify-between items-center`}>
                <div className="flex flex-col gap-1">
                   <span className={`text-sm font-bold ${m?.winnerId === m?.player1Id ? 'text-forest-400' : 'text-white'}`}>{m?.player1Name || 'TBD'} <span className="text-ash-500 text-xs font-normal">({isCompleted ? m?.score1 : '-'})</span></span>
                   <span className="text-[10px] text-ash-500 uppercase">VS</span>
                   <span className={`text-sm font-bold ${m?.winnerId === m?.player2Id ? 'text-forest-400' : 'text-white'}`}>{m?.player2Name || 'TBD'} <span className="text-ash-500 text-xs font-normal">({isCompleted ? m?.score2 : '-'})</span></span>
                </div>
                {m?.status === MatchStatus.SCHEDULED && <Button size="sm" variant="outline" onClick={() => onReport(m)}>Report</Button>}
                {isCompleted && <span className="text-xs text-forest-500 flex items-center gap-1"><CheckCircle2 size={12}/> Done</span>}
             </div>
           )
        })}
     </div>
  )
}

export const Tournaments: React.FC<TournamentsProps> = ({ tournaments = [], circuits = [], currentUser, onCreateTournament, onEditTournament, onDeleteTournament, onRegister, onStartTournament, onReportMatch }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingTournamentId, setViewingTournamentId] = useState<string | null>(null);
  const [reportingMatch, setReportingMatch] = useState<TournamentMatch | null>(null);

  const [newTourney, setNewTourney] = useState({
    title: '',
    game: 'Pickle Pete',
    type: GameType.SOLO,
    format: TournamentFormat.FFA_LEAGUE,
    tier: TournamentTier.DAILY,
    startDate: '',
    maxParticipants: 10,
    circuitId: circuits?.[0]?.id || ''
  });

  const viewingTournament = tournaments?.find(t => t.id === viewingTournamentId) || null;
  const [gameResults, setGameResults] = useState<{winner: 'p1'|'p2'|null, p1Perfect: boolean, p2Perfect: boolean}[]>([{ winner: null, p1Perfect: false, p2Perfect: false }]);

  const handleReportSubmit = () => {
    if (reportingMatch) {
      let s1 = 0;
      let s2 = 0;
      let p1Perfects = 0;
      let p2Perfects = 0;

      gameResults.forEach(g => {
        if (g.winner === 'p1') { s1++; if (g.p1Perfect) p1Perfects++; }
        if (g.winner === 'p2') { s2++; if (g.p2Perfect) p2Perfects++; }
      });

      const winnerId = s1 > s2 ? reportingMatch.player1Id! : reportingMatch.player2Id!;
      const p1Stats = p1Perfects > 0 ? { perfectRounds: p1Perfects } : undefined;
      const p2Stats = p2Perfects > 0 ? { perfectRounds: p2Perfects } : undefined;

      onReportMatch(reportingMatch.tournamentId, reportingMatch.id, s1, s2, winnerId, undefined, p1Stats, p2Stats);
      
      setReportingMatch(null);
      setGameResults([{ winner: null, p1Perfect: false, p2Perfect: false }]);
    }
  };

  const handleCreate = () => {
    if (!newTourney.title || !newTourney.startDate) return;
    onCreateTournament(newTourney);
    setIsCreateModalOpen(false);
    setNewTourney({ ...newTourney, title: '', startDate: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white uppercase">Tournaments & Leagues</h1>
          <p className="text-ash-500 text-sm">Join a competition or view your progress.</p>
        </div>
        {currentUser?.isAdmin && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto">
            <Plus size={18} className="mr-2" /> New Tournament
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(tournaments || []).map(tournament => (
          <div key={tournament?.id} className="bg-carbon-800 border border-carbon-700 rounded-lg overflow-hidden flex flex-col group shadow-lg">
            <div className="relative h-40 overflow-hidden">
              <img src={tournament?.imageUrl} alt={tournament?.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-60" />
              <div className="absolute top-2 right-2 bg-carbon-900/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-forest-400 border border-forest-500/20 uppercase">
                {tournament?.tier}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-carbon-800 to-transparent"></div>
            </div>
            <div className="p-5 flex-1 flex flex-col relative">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-ash-500 uppercase font-bold tracking-wider">{tournament?.game}</span>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  tournament?.status === TournamentStatus.OPEN ? 'bg-forest-900/30 text-forest-500 border-forest-500/20' :
                  tournament?.status === TournamentStatus.ONGOING ? 'bg-yellow-900/30 text-yellow-500 border-yellow-500/20' :
                  'bg-ash-700/30 text-ash-300 border-ash-500/20'
                }`}>
                  {tournament?.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-4 line-clamp-1">{tournament?.title}</h3>
              <div className="flex items-center gap-4 text-xs text-ash-400 mb-6">
                <div className="flex items-center gap-1.5"><Users size={14} className="text-forest-500" /> {tournament?.participants}/{tournament?.maxParticipants}</div>
                <div className="flex items-center gap-1.5"><Calendar size={14} className="text-blue-400" /> {tournament?.startDate}</div>
              </div>
              <div className="mt-auto pt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setViewingTournamentId(tournament?.id)}>View</Button>
                {tournament?.status === TournamentStatus.OPEN && !tournament?.registrations?.some(r => r.id === currentUser?.id) && (
                  <Button size="sm" className="flex-1" onClick={() => onRegister(tournament?.id, currentUser?.username || 'Contender')}>Register</Button>
                )}
                {currentUser?.isAdmin && tournament?.status === TournamentStatus.OPEN && tournament?.participants >= 2 && (
                  <Button size="sm" variant="outline" className="flex-1 border-yellow-600 text-yellow-500 hover:bg-yellow-600/10" onClick={() => onStartTournament(tournament?.id)}>Start</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-carbon-800 border border-carbon-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-carbon-700 bg-carbon-900/50 flex justify-between items-center">
               <h2 className="text-xl font-display font-bold text-white uppercase flex items-center gap-2">
                  <Plus className="text-forest-500" size={20} /> New Tournament
               </h2>
               <button onClick={() => setIsCreateModalOpen(false)} className="text-ash-500 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Tournament Title</label>
                  <input type="text" value={newTourney.title} onChange={e => setNewTourney({...newTourney, title: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" placeholder="e.g. Summer Cup 2024" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Game</label>
                    <input type="text" value={newTourney.game} onChange={e => setNewTourney({...newTourney, game: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Start Date</label>
                    <input type="text" value={newTourney.startDate} onChange={e => setNewTourney({...newTourney, startDate: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" placeholder="Dec 20" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Format</label>
                    <select value={newTourney.format} onChange={e => setNewTourney({...newTourney, format: e.target.value as TournamentFormat})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white text-sm">
                       <option value={TournamentFormat.SINGLE_ELIMINATION}>Brackets (Elimination)</option>
                       <option value={TournamentFormat.ROUND_ROBIN}>League (1v1 Matches)</option>
                       <option value={TournamentFormat.FFA_LEAGUE}>League (Group Points)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Participants</label>
                    <input type="number" value={newTourney.maxParticipants} onChange={e => setNewTourney({...newTourney, maxParticipants: parseInt(e.target.value)})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Circuit Association</label>
                  <select value={newTourney.circuitId} onChange={e => setNewTourney({...newTourney, circuitId: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white text-sm">
                     {(circuits || []).map(c => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
                  </select>
               </div>
            </div>
            <div className="p-6 bg-carbon-900/50 flex gap-3">
               <Button variant="secondary" className="flex-1" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
               <Button className="flex-1" onClick={handleCreate} disabled={!newTourney.title || !newTourney.startDate}>Create Tournament</Button>
            </div>
          </div>
        </div>
      )}

      {viewingTournament && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in">
          <div className="bg-carbon-900 border border-carbon-700 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-carbon-700 flex justify-between items-center bg-carbon-800">
              <div className="flex items-center gap-4">
                <button onClick={() => setViewingTournamentId(null)} className="p-2 hover:bg-carbon-700 rounded-full text-ash-400 transition-colors"><ChevronLeft size={24} /></button>
                <div>
                   <h2 className="text-xl font-display font-bold text-white uppercase">{viewingTournament?.title}</h2>
                   <p className="text-xs text-ash-500 uppercase tracking-widest">{viewingTournament?.game} • {viewingTournament?.format}</p>
                </div>
              </div>
              <div className="flex gap-2">
                 {currentUser?.isAdmin && (
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => { onDeleteTournament(viewingTournament?.id); setViewingTournamentId(null); }}><Trash2 size={18} /></Button>
                 )}
                 <button onClick={() => setViewingTournamentId(null)} className="text-ash-500 hover:text-white p-2 transition-colors"><X size={24} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
               {viewingTournament?.status === TournamentStatus.ONGOING || viewingTournament?.status === TournamentStatus.COMPLETED ? (
                 <div className="space-y-10">
                    {viewingTournament?.format === TournamentFormat.SINGLE_ELIMINATION ? (
                      <div>
                        <h3 className="text-sm font-bold text-ash-500 uppercase mb-6 flex items-center gap-2"><GitMerge size={16} className="text-forest-500" /> Tournament Bracket</h3>
                        <DynamicBracket matches={viewingTournament?.matches} onReport={setReportingMatch} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         <div className="lg:col-span-2">
                            <h3 className="text-sm font-bold text-ash-500 uppercase mb-4 border-b border-carbon-700 pb-2">League Standings</h3>
                            <DynamicLeagueTable registrations={viewingTournament?.registrations} matches={viewingTournament?.matches} />
                         </div>
                         <div className="space-y-6">
                            <h3 className="text-sm font-bold text-ash-500 uppercase mb-4 border-b border-carbon-700 pb-2">Schedule</h3>
                            <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar"><DynamicSchedule matches={viewingTournament?.matches} onReport={setReportingMatch} /></div>
                         </div>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-20 h-20 rounded-full bg-carbon-800 border-2 border-dashed border-carbon-600 flex items-center justify-center mb-6"><Trophy size={40} className="text-carbon-600" /></div>
                    <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">Registration is Open</h3>
                    <div className="mt-8 flex gap-4">
                       <Button variant="secondary" onClick={() => setViewingTournamentId(null)}>Back</Button>
                       {!viewingTournament?.registrations?.some(r => r.id === currentUser?.id) && (
                         <Button onClick={() => onRegister(viewingTournament?.id, currentUser?.username || 'Contender')}>Register Now</Button>
                       )}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {reportingMatch && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95">
            <div className="bg-carbon-800 border border-carbon-700 rounded-xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
               <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-6">Report Score</h2>
               
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                  <div className="flex justify-between items-end border-b border-carbon-700 pb-4 mb-4">
                     <div className="text-center w-1/2">
                        <span className="text-3xl font-bold text-white block mb-1">{gameResults.filter(g => g.winner === 'p1').length}</span>
                        <label className="text-[10px] text-ash-500 uppercase font-bold block line-clamp-1 px-2">{reportingMatch?.player1Name || 'Player 1'}</label>
                     </div>
                     <div className="text-center w-1/2">
                        <span className="text-3xl font-bold text-white block mb-1">{gameResults.filter(g => g.winner === 'p2').length}</span>
                        <label className="text-[10px] text-ash-500 uppercase font-bold block line-clamp-1 px-2">{reportingMatch?.player2Name || 'Player 2'}</label>
                     </div>
                  </div>

                  <div className="space-y-4">
                     {gameResults.map((game, idx) => (
                        <div key={idx} className="bg-carbon-900 border border-carbon-700 rounded-lg p-4">
                           <div className="text-xs text-ash-500 uppercase font-bold mb-3 flex justify-between items-center">
                              <span>Game {idx + 1}</span>
                              {gameResults.length > 1 && (
                                 <button onClick={() => setGameResults(gameResults.filter((_, i) => i !== idx))} className="text-ash-500 hover:text-red-400 transition-colors"><X size={14}/></button>
                              )}
                           </div>
                           <div className="flex gap-4">
                              <div className="flex-1 space-y-2">
                                 <Button size="sm" variant={game.winner === 'p1' ? 'primary' : 'outline'} className={`w-full ${game.winner === 'p1' ? 'bg-forest-600 hover:bg-forest-500 border-forest-500 text-white' : 'text-ash-400'}`} onClick={() => { const newResults = [...gameResults]; newResults[idx].winner = 'p1'; newResults[idx].p2Perfect = false; setGameResults(newResults); }}>P1 Won</Button>
                                 {game.winner === 'p1' && (
                                    <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-ash-400 cursor-pointer justify-center select-none animate-in fade-in">
                                       <input type="checkbox" checked={game.p1Perfect} onChange={e => { const newResults = [...gameResults]; newResults[idx].p1Perfect = e.target.checked; setGameResults(newResults); }} className="rounded border-carbon-600 bg-carbon-800 text-forest-500 focus:ring-forest-500 focus:ring-offset-carbon-900 w-3 h-3" />
                                       Perfect
                                    </label>
                                 )}
                              </div>
                              <div className="flex-1 space-y-2">
                                 <Button size="sm" variant={game.winner === 'p2' ? 'primary' : 'outline'} className={`w-full ${game.winner === 'p2' ? 'bg-forest-600 hover:bg-forest-500 border-forest-500 text-white' : 'text-ash-400'}`} onClick={() => { const newResults = [...gameResults]; newResults[idx].winner = 'p2'; newResults[idx].p1Perfect = false; setGameResults(newResults); }}>P2 Won</Button>
                                 {game.winner === 'p2' && (
                                    <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-ash-400 cursor-pointer justify-center select-none animate-in fade-in">
                                       <input type="checkbox" checked={game.p2Perfect} onChange={e => { const newResults = [...gameResults]; newResults[idx].p2Perfect = e.target.checked; setGameResults(newResults); }} className="rounded border-carbon-600 bg-carbon-800 text-forest-500 focus:ring-forest-500 focus:ring-offset-carbon-900 w-3 h-3" />
                                       Perfect
                                    </label>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                  
                  <Button variant="ghost" className="w-full border border-dashed border-carbon-600 text-ash-400 hover:text-white mt-2" onClick={() => setGameResults([...gameResults, { winner: null, p1Perfect: false, p2Perfect: false }])}>
                     <Plus size={16} className="mr-2" /> Add Game
                  </Button>
               </div>

               <div className="flex gap-3 mt-6 pt-6 border-t border-carbon-700 shrink-0">
                  <Button variant="secondary" className="flex-1" onClick={() => { setReportingMatch(null); setGameResults([{ winner: null, p1Perfect: false, p2Perfect: false }]); }}>Cancel</Button>
                  <Button className="flex-1" onClick={handleReportSubmit} disabled={gameResults.every(g => g.winner === null) || gameResults.filter(g => g.winner === 'p1').length === gameResults.filter(g => g.winner === 'p2').length}>Submit</Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};