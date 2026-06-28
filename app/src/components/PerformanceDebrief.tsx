import { useEffect, useState } from 'react'
import { generatePerformanceDebrief } from '../services/insightService'
import type { Insight } from '../services/insightService'
import { useAuth } from '../context/AuthContext'
import { Activity, ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react'

export default function PerformanceDebrief() {
  const { user } = useAuth()
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    generatePerformanceDebrief(user.id).then(({ success, insights }) => {
      if (success && insights) setInsights(insights)
      setLoading(false)
    })
  }, [user])

  if (loading) {
    return <div className="h-32 bg-steel-900 border border-steel-700 rounded-lg animate-pulse" />
  }

  if (insights.length === 0) {
    return (
      <div className="bg-steel-900 border border-steel-700 rounded-lg p-6 text-center">
        <Activity size={24} className="text-ink-600 mx-auto mb-2" />
        <h3 className="text-sm font-display font-bold text-ink-300 uppercase tracking-widest">Awaiting Intel</h3>
        <p className="text-xs font-mono text-ink-500 mt-1">Deploy into the field to generate performance insights.</p>
      </div>
    )
  }

  return (
    <div className="bg-steel-900 border border-steel-700 rounded-lg overflow-hidden">
      <div className="bg-steel-800/50 px-4 py-3 border-b border-steel-700 flex items-center justify-between">
        <h3 className="text-xs font-mono text-ink-300 uppercase tracking-widest flex items-center gap-2">
          <TrendingUp size={14} className="text-pulse-400" /> Performance Debrief
        </h3>
        <span className="text-[9px] font-mono text-ink-500 uppercase">Last 7 Days</span>
      </div>
      
      <div className="divide-y divide-steel-800/50">
        {insights.map((insight) => (
          <div key={insight.id} className="p-4 flex gap-4 items-start group hover:bg-steel-800/20 transition-colors">
            <div className={`mt-1 flex-shrink-0 p-1.5 rounded-full ${
              insight.type === 'positive' ? 'bg-victory-500/20 text-victory-400' :
              insight.type === 'warning' ? 'bg-threat-500/20 text-threat-400' :
              'bg-ink-500/20 text-ink-400'
            }`}>
              {insight.type === 'positive' ? <ArrowUpRight size={14} /> :
               insight.type === 'warning' ? <ArrowDownRight size={14} /> :
               <Minus size={14} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-ink-100 uppercase tracking-wider">{insight.title}</h4>
                {insight.metric && (
                  <span className="text-xs font-mono font-bold text-pulse-400 bg-pulse-500/10 px-2 py-0.5 rounded">
                    {insight.metric}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-400 mt-1">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
