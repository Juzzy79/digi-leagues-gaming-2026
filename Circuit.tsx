
import React, { useRef, useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, TrendingUp, Target, Crown, Flag, ArrowRight, Edit2, X, Image as ImageIcon } from 'lucide-react';
import { Circuit, User, Tournament, TournamentStatus } from '../types';
import { Button } from '../components/Button';

interface CircuitViewProps {
  circuit: Circuit;
  tournaments: Tournament[];
  users: User[];
  currentUser: User;
  onUpdateCircuit: (c: Circuit) => Promise<void>;
  onNavigateToTournament: (tId: string) => void;
}

export const CircuitView: React.FC<CircuitViewProps> = ({ circuit, tournaments = [], users = [], currentUser, onUpdateCircuit, onNavigateToTournament }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedCircuit, setEditedCircuit] = useState<Circuit>(circuit);

  const circuitTournaments = (tournaments || []).filter(t => t?.circuitId === circuit?.id);
  const sortedUsers = [...(users || [])].sort((a, b) => (b?.circuitPoints || 0) - (a?.circuitPoints || 0));
  const topThree = sortedUsers.slice(0, 3);
  const restUsers = sortedUsers.slice(3);

  const handleSave = async () => {
    if (onUpdateCircuit) await onUpdateCircuit(editedCircuit);
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative rounded-xl overflow-hidden border border-carbon-700 h-80 bg-carbon-900 group">
        <img src={circuit?.bannerUrl} alt={circuit?.name} className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-carbon-900 via-carbon-900/50 to-transparent"></div>
        
        {currentUser?.isAdmin && (
           <button onClick={() => { setEditedCircuit(circuit); setIsEditModalOpen(true); }} className="absolute top-4 right-4 z-20 bg-carbon-800/80 hover:bg-forest-600 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold transition-all border border-carbon-700">
              <Edit2 size={14} /> Edit Circuit
           </button>
        )}

        <div className="absolute bottom-0 left-0 p-8 w-full">
          <div className="flex items-center gap-2 text-forest-400 mb-2">
             <Crown size={20} className="fill-current" />
             <span className="uppercase font-bold tracking-widest text-sm">{circuit?.season}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 uppercase">{circuit?.name}</h1>
          <div className="flex flex-wrap gap-6 text-sm text-ash-300">
            <div className="flex items-center gap-2"><MapPin size={18} className="text-forest-500" /> {circuit?.region}</div>
            <div className="flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> {circuit?.prizePool}</div>
            <div className="flex items-center gap-2"><Calendar size={18} className="text-blue-400" /> {circuit?.startDate} - {circuit?.endDate}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-white uppercase flex items-center gap-2">
                <Flag size={20} className="text-forest-500" /> Circuit Roadmap
              </h2>
           </div>
           <div className="relative space-y-4">
              <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-carbon-700"></div>
              {circuitTournaments?.length > 0 ? circuitTournaments.map((t, index) => (
                 <div key={t?.id} className="relative flex items-center gap-6 group">
                    <div className={`w-12 h-12 shrink-0 rounded-full border-4 flex items-center justify-center z-10 bg-carbon-800 transition-colors ${t?.status === TournamentStatus.COMPLETED ? 'border-forest-500 text-forest-500' : 'border-carbon-600 text-ash-500'}`}>
                       <span className="font-display font-bold text-sm">0{index + 1}</span>
                    </div>
                    <div className="flex-1 p-3 rounded-lg border bg-carbon-800 border-carbon-700 hover:border-carbon-600 transition-all cursor-pointer" onClick={() => onNavigateToTournament(t?.id)}>
                       <div className="flex justify-between items-start">
                          <div>
                             <span className="text-xs font-bold uppercase mb-1 block text-ash-500">{t?.status} • {t?.tier}</span>
                             <h3 className="text-lg font-bold text-white group-hover:text-forest-400 transition-colors">{t?.title}</h3>
                             <p className="text-sm text-ash-400 mt-1">{t?.startDate} • {t?.game}</p>
                          </div>
                          <Button size="sm" variant="secondary">View</Button>
                       </div>
                    </div>
                 </div>
              )) : (
                <div className="p-8 text-center bg-carbon-800 border border-dashed border-carbon-700 rounded-lg ml-12">
                   <p className="text-ash-500 text-sm">No tournaments linked to this circuit yet.</p>
                </div>
              )}
           </div>
        </div>

        <div className="space-y-6">
           <h2 className="text-xl font-display font-bold text-white uppercase flex items-center gap-2">
             <TrendingUp size={20} className="text-yellow-500" /> Season Standings
           </h2>
           <div className="grid grid-cols-3 gap-2 items-end mb-6">
              {topThree[1] && (
                 <div className="bg-carbon-800/50 border border-carbon-700 rounded-t-lg p-3 flex flex-col items-center h-32 justify-end">
                    <div className="w-10 h-10 rounded-full bg-carbon-700 border border-carbon-600 mb-2 overflow-hidden"><img src={topThree[1]?.avatarUrl} className="w-full h-full object-cover" /></div>
                    <div className="font-bold text-[10px] text-white truncate w-full">{topThree[1]?.username}</div>
                    <div className="text-[10px] text-ash-500">{topThree[1]?.circuitPoints} pts</div>
                    <div className="mt-2 text-2xl font-display font-bold text-ash-400">2</div>
                 </div>
              )}
              {topThree[0] && (
                 <div className="bg-gradient-to-b from-forest-900/20 to-carbon-800 border border-forest-500/30 rounded-t-lg p-3 flex flex-col items-center h-40 justify-end shadow-lg shadow-forest-900/20">
                    <Crown size={16} className="text-yellow-500 mb-1" />
                    <div className="w-14 h-14 rounded-full bg-carbon-700 border-2 border-yellow-500 mb-2 overflow-hidden"><img src={topThree[0]?.avatarUrl} className="w-full h-full object-cover" /></div>
                    <div className="font-bold text-xs text-white truncate w-full">{topThree[0]?.username}</div>
                    <div className="text-xs text-forest-400 font-bold">{topThree[0]?.circuitPoints} pts</div>
                    <div className="mt-2 text-3xl font-display font-bold text-yellow-500">1</div>
                 </div>
              )}
              {topThree[2] && (
                 <div className="bg-carbon-800/50 border border-carbon-700 rounded-t-lg p-3 flex flex-col items-center h-28 justify-end">
                    <div className="w-10 h-10 rounded-full bg-carbon-700 border border-carbon-600 mb-2 overflow-hidden"><img src={topThree[2]?.avatarUrl} className="w-full h-full object-cover" /></div>
                    <div className="font-bold text-[10px] text-white truncate w-full">{topThree[2]?.username}</div>
                    <div className="text-[10px] text-ash-500">{topThree[2]?.circuitPoints} pts</div>
                    <div className="mt-2 text-2xl font-display font-bold text-amber-700">3</div>
                 </div>
              )}
           </div>
           <div className="bg-carbon-800 border border-carbon-700 rounded-lg overflow-hidden">
              <div className="p-3 bg-carbon-900 border-b border-carbon-700 flex justify-between text-xs font-bold text-ash-500 uppercase">
                 <span>Player</span>
                 <span>Points</span>
              </div>
              <div className="divide-y divide-carbon-700">
                 {restUsers?.length > 0 ? restUsers.map((u, i) => (
                    <div key={u?.id} className="p-3 flex items-center justify-between hover:bg-carbon-700/50 transition-colors">
                       <div className="flex items-center gap-3">
                          <span className="text-ash-500 font-mono text-xs w-4">{i + 4}</span>
                          <span className="text-sm font-medium text-white">{u?.username || 'Unknown'}</span>
                       </div>
                       <span className="font-mono text-sm font-bold text-forest-400">{u?.circuitPoints || 0}</span>
                    </div>
                 )) : <div className="p-4 text-center text-xs text-ash-500 uppercase">Season beginning...</div>}
              </div>
           </div>
        </div>
      </div>

      {isEditModalOpen && (
        <>
          <div className="fixed inset-0 z-[99] bg-black/50"
               onClick={() => setIsEditModalOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-[100] w-full max-w-lg
               bg-carbon-800 border-l border-carbon-700 shadow-2xl
               overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 space-y-4">
               <div className="flex justify-between items-center border-b border-carbon-700 pb-4 mb-2">
                 <h2 className="text-xl font-display font-bold text-white uppercase">Circuit Brand Manager</h2>
                 <button onClick={() => setIsEditModalOpen(false)} className="text-ash-500 hover:text-white"><X size={24} /></button>
               </div>
               <div>
                  <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Circuit Name</label>
                  <input type="text" value={editedCircuit?.name} onChange={e => setEditedCircuit({...editedCircuit, name: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Season Tag</label>
                    <input type="text" value={editedCircuit?.season} onChange={e => setEditedCircuit({...editedCircuit, season: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Region</label>
                    <input type="text" value={editedCircuit?.region} onChange={e => setEditedCircuit({...editedCircuit, region: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Banner URL</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-ash-500" size={16} />
                    <input type="text" value={editedCircuit?.bannerUrl} onChange={e => setEditedCircuit({...editedCircuit, bannerUrl: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 pl-9 text-white" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Start Date</label>
                    <input type="text" value={editedCircuit?.startDate} onChange={e => setEditedCircuit({...editedCircuit, startDate: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">End Date</label>
                    <input type="text" value={editedCircuit?.endDate} onChange={e => setEditedCircuit({...editedCircuit, endDate: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] text-ash-500 uppercase font-bold mb-1 block">Prize Pool Description</label>
                  <input type="text" value={editedCircuit?.prizePool} onChange={e => setEditedCircuit({...editedCircuit, prizePool: e.target.value})} className="w-full bg-carbon-900 border border-carbon-700 rounded p-2 text-white" />
               </div>
               <div className="flex gap-3 pt-4 border-t border-carbon-700">
                  <Button variant="secondary" className="flex-1" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleSave}>Apply Branding</Button>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};