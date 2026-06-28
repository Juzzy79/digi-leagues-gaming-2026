import { ShieldAlert } from 'lucide-react'

export interface DogTagProps {
  victimName: string;
  netScore: number;
}

export default function DogTag({ victimName, netScore }: DogTagProps) {
  return (
    <div className="inline-flex flex-col items-center group relative">
      <div className="w-10 h-14 bg-gradient-to-br from-steel-700 to-steel-800 rounded-sm border border-steel-500 shadow-md shadow-black/50 overflow-hidden relative flex flex-col items-center justify-center transform group-hover:-translate-y-1 group-hover:shadow-nexus-900/50 transition-all">
        {/* Chain hole */}
        <div className="w-2 h-2 rounded-full bg-steel-950 border border-steel-600 absolute top-1 left-1/2 -translate-x-1/2"></div>
        
        {/* Detail text */}
        <div className="mt-3 flex flex-col items-center">
          <ShieldAlert size={12} className="text-duel-500/80 mb-0.5" />
          <span className="font-mono text-[8px] text-ink-300 uppercase truncate w-[32px] text-center" title={victimName}>
            {victimName.substring(0, 4)}
          </span>
          <span className="font-mono text-[8px] text-nexus-400 font-bold mt-0.5">{netScore > 0 ? `+${netScore}` : netScore}</span>
        </div>
      </div>
    </div>
  )
}
