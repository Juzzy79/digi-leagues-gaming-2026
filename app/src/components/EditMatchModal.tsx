import React, { useState } from 'react';
import { X, Save, Car, Users, Skull } from 'lucide-react';
import Button from './Button';
import { updateMatchMetadata } from '../services/matchService';
import toast from 'react-hot-toast';

interface EditMatchModalProps {
  match: any;
  onClose: () => void;
  onSave: (updatedMatch: any) => void;
}

export default function EditMatchModal({ match, onClose, onSave }: EditMatchModalProps) {
  const [stats, setStats] = useState<any>(match.stats || {});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'rival' | 'teammates' | 'car'>(
    match.genre === 'Racing' ? 'car' : 'rival'
  );

  const handleSave = async () => {
    setSubmitting(true);
    
    // Clean up empty rivals/teammates if they were cleared out
    const finalStats = { ...stats };
    
    if (finalStats.rival && !finalStats.rival.name?.trim()) {
      delete finalStats.rival;
    }
    
    if (finalStats.teammates) {
      finalStats.teammates = finalStats.teammates.filter((t: any) => t.name?.trim());
      if (finalStats.teammates.length === 0) {
        delete finalStats.teammates;
      }
    }

    const res = await updateMatchMetadata(match.id, finalStats);
    setSubmitting(false);

    if (res.success) {
      toast.success('MATCH METADATA UPDATED');
      onSave({ ...match, stats: finalStats });
    } else {
      toast.error('FAILED TO UPDATE LEDGER');
    }
  };

  const addTeammate = () => {
    const current = stats.teammates || [];
    setStats({ ...stats, teammates: [...current, { name: '', kills: 0, deaths: 0, assists: 0 }] });
  };

  const removeTeammate = (index: number) => {
    const current = [...(stats.teammates || [])];
    current.splice(index, 1);
    setStats({ ...stats, teammates: current });
  };

  const updateTeammate = (index: number, field: string, value: string | number) => {
    const current = [...(stats.teammates || [])];
    current[index] = { ...current[index], [field]: value };
    setStats({ ...stats, teammates: current });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-steel-950 border-2 border-steel-700 shadow-2xl rounded-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-steel-800 bg-steel-900">
          <div>
            <h3 className="font-display font-black text-ink-100 uppercase tracking-widest text-lg">
              Edit Operation Log
            </h3>
            <p className="text-[10px] font-mono text-ink-500">
              {match.game} · {new Date(match.created_at).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-300">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-steel-800 bg-steel-900/50 p-2 gap-2 overflow-x-auto">
          {match.genre === 'Racing' && (
            <button
              onClick={() => setActiveTab('car')}
              className={`flex-1 py-2 px-4 rounded text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                activeTab === 'car' ? 'bg-nexus-500/20 text-nexus-400 border border-nexus-500/50' : 'text-ink-500 hover:bg-steel-800'
              }`}
            >
              <Car size={14} /> Vehicle
            </button>
          )}
          <button
            onClick={() => setActiveTab('rival')}
            className={`flex-1 py-2 px-4 rounded text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'rival' ? 'bg-threat-500/20 text-threat-400 border border-threat-500/50' : 'text-ink-500 hover:bg-steel-800'
            }`}
          >
            <Skull size={14} /> Rival
          </button>
          {match.genre !== 'Racing' && match.genre !== 'Puzzle' && (
            <button
              onClick={() => setActiveTab('teammates')}
              className={`flex-1 py-2 px-4 rounded text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                activeTab === 'teammates' ? 'bg-duel-500/20 text-duel-400 border border-duel-500/50' : 'text-ink-500 hover:bg-steel-800'
              }`}
            >
              <Users size={14} /> Teammates
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono">
          
          {/* CAR TAB */}
          {activeTab === 'car' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-ink-500 tracking-widest font-bold">Vehicle Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Porsche 911 GT3 RS"
                  value={stats.car_name || ''}
                  onChange={e => setStats({ ...stats, car_name: e.target.value })}
                  className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors font-bold uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-ink-500 tracking-widest font-bold">Car Class</label>
                  <input 
                    type="text"
                    placeholder="e.g. S1, A"
                    value={stats.car_class || ''}
                    onChange={e => setStats({ ...stats, car_class: e.target.value })}
                    className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors font-bold uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-ink-500 tracking-widest font-bold">Horsepower</label>
                  <input 
                    type="number"
                    placeholder="e.g. 725"
                    value={stats.car_hp || ''}
                    onChange={e => setStats({ ...stats, car_hp: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-nexus-400 focus:border-nexus-500 focus:outline-none transition-colors font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* RIVAL TAB */}
          {activeTab === 'rival' && (
            <div className="space-y-4">
              <div className="bg-threat-900/10 border border-threat-500/20 p-4 rounded mb-4">
                <p className="text-[10px] text-threat-400/80 leading-relaxed">
                  Did you encounter a Nemesis or someone who deserves to be on your hit list? Logging their name here updates your Nemesis Tracker.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-ink-500 tracking-widest font-bold">Rival Name</label>
                <input 
                  type="text"
                  placeholder="e.g. xX_Sniper_Xx"
                  value={stats.rival?.name || ''}
                  onChange={e => setStats({ 
                    ...stats, 
                    rival: { ...stats.rival, name: e.target.value } 
                  })}
                  className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-threat-400 focus:border-threat-500 focus:outline-none transition-colors font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-ink-500 tracking-widest font-bold">Your Kills on Rival</label>
                  <input 
                    type="number"
                    value={stats.rival?.kills_on_rival || ''}
                    onChange={e => setStats({ 
                      ...stats, 
                      rival: { ...stats.rival, kills_on_rival: Number(e.target.value) } 
                    })}
                    className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-threat-400 focus:border-threat-500 focus:outline-none transition-colors font-bold"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-ink-500 tracking-widest font-bold">Rival Kills on You</label>
                  <input 
                    type="number"
                    value={stats.rival?.deaths_to_rival || ''}
                    onChange={e => setStats({ 
                      ...stats, 
                      rival: { ...stats.rival, deaths_to_rival: Number(e.target.value) } 
                    })}
                    className="w-full bg-steel-900 border border-steel-700 px-4 py-2 text-threat-400 focus:border-threat-500 focus:outline-none transition-colors font-bold"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TEAMMATES TAB */}
          {activeTab === 'teammates' && (
            <div className="space-y-4">
              <div className="bg-duel-900/10 border border-duel-500/20 p-4 rounded mb-4">
                <p className="text-[10px] text-duel-400/80 leading-relaxed">
                  Log the performance of your co-op squad. This feeds into the Co-Op Analytics board.
                </p>
              </div>

              {(stats.teammates || []).map((teammate: any, idx: number) => (
                <div key={idx} className="bg-steel-900 border border-steel-700 p-4 rounded relative">
                  <button 
                    onClick={() => removeTeammate(idx)}
                    className="absolute top-2 right-2 text-steel-500 hover:text-threat-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="space-y-3 mt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-ink-500 tracking-widest font-bold">Teammate Name</label>
                      <input 
                        type="text"
                        placeholder="Name"
                        value={teammate.name}
                        onChange={e => updateTeammate(idx, 'name', e.target.value)}
                        className="w-full bg-steel-950 border border-steel-700 px-3 py-1.5 text-duel-400 focus:border-duel-500 focus:outline-none text-xs font-bold uppercase"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-ink-500 tracking-widest font-bold">Kills</label>
                        <input type="number" value={teammate.kills} onChange={e => updateTeammate(idx, 'kills', Number(e.target.value))} className="w-full bg-steel-950 border border-steel-700 px-3 py-1.5 text-ink-300 focus:outline-none text-xs text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-ink-500 tracking-widest font-bold">Deaths</label>
                        <input type="number" value={teammate.deaths} onChange={e => updateTeammate(idx, 'deaths', Number(e.target.value))} className="w-full bg-steel-950 border border-steel-700 px-3 py-1.5 text-ink-300 focus:outline-none text-xs text-center" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-ink-500 tracking-widest font-bold">Assists</label>
                        <input type="number" value={teammate.assists} onChange={e => updateTeammate(idx, 'assists', Number(e.target.value))} className="w-full bg-steel-950 border border-steel-700 px-3 py-1.5 text-ink-300 focus:outline-none text-xs text-center" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button type="button" variant="ghost" onClick={addTeammate} className="w-full border border-dashed border-steel-700 text-ink-500 text-xs">
                + Add Teammate
              </Button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-steel-800 bg-steel-900 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={submitting} className="flex items-center gap-2">
            <Save size={16} /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
