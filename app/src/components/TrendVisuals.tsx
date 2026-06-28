import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { TrendingUp, Activity } from 'lucide-react'

export default function TrendVisuals({ userId }: { userId: string }) {
  const [data, setData] = useState<{ id: string, usr_snapshot: number, created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('match_history')
      .select('id, usr_snapshot, created_at')
      .eq('user_id', userId)
      .not('usr_snapshot', 'is', null)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setData(data || [])
        setLoading(false)
      })
  }, [userId])

  if (loading) return <div className="h-40 bg-steel-900 border border-steel-700 rounded-lg animate-pulse" />

  if (data.length < 2) return null; // Need at least 2 points for a trend

  // Calculate domain
  const minUsr = Math.min(...data.map(d => d.usr_snapshot)) - 50
  const maxUsr = Math.max(...data.map(d => d.usr_snapshot)) + 50

  return (
    <div className="bg-steel-950 border border-steel-700 rounded-lg p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-display font-bold uppercase text-nexus-400 tracking-widest flex items-center gap-2">
           <Activity size={14} /> USR Trendline
        </h3>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis domain={[minUsr, maxUsr]} hide />
            <Tooltip 
               contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', fontSize: '10px', fontFamily: 'monospace' }}
               itemStyle={{ color: '#2dd4bf' }}
               labelFormatter={() => ''}
               formatter={(val: number) => [`${val} USR`, 'Rating']}
            />
            <Line 
               type="monotone" 
               dataKey="usr_snapshot" 
               stroke="#2dd4bf" 
               strokeWidth={2} 
               dot={false}
               activeDot={{ r: 4, fill: '#2dd4bf', stroke: '#0f172a', strokeWidth: 2 }}
               isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
