import { BookOpen, ShieldAlert, Crosshair, Trophy } from 'lucide-react'

export default function FieldManual() {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 lg:p-8 overflow-y-auto custom-scrollbar">
      
      <div className="mb-8 border-b border-steel-800 pb-6">
        <h1 className="text-3xl font-display font-black text-ink-50 uppercase tracking-widest flex items-center gap-3">
          <BookOpen className="text-nexus-500" size={28} /> Operator Field Manual
        </h1>
        <p className="font-mono text-ink-400 mt-2 text-sm">Rules of Engagement and System Regulations — V2.0 (2026)</p>
      </div>

      <div className="space-y-8 text-ink-300 font-body leading-relaxed text-sm">
        
        <section className="bg-steel-900 border border-steel-700/50 p-6 rounded-lg">
          <h2 className="text-xl font-display font-bold text-ink-100 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Trophy className="text-circuit-500" size={20} /> 1. Operations & Deployment
          </h2>
          <p className="mb-4">
            Operators must adhere to deploying only for approved Circuits and Tournaments documented within the system. Manual untracked combat is considered off-grid and will not yield MMR or progression.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-ink-400">
            <li>Matches are restricted to one entry per participant conflict per hour.</li>
            <li>MMR is automatically regulated; interference with calculation heuristics is a Level 5 violation.</li>
            <li>Circuits act as overarching seasonal structures containing multiple specialized Tournaments.</li>
          </ul>
        </section>

        <section className="bg-steel-900 border border-steel-700/50 p-6 rounded-lg">
          <h2 className="text-xl font-display font-bold text-ink-100 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Crosshair className="text-duel-500" size={20} /> 2. Rivalries & Nemesis Protocols
          </h2>
          <p className="mb-4">
            Personal vendettas are systemically tracked via the Rivalry protocol. Combat results directly impact the net score between any two operators.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-ink-400">
            <li>A net score of <span className="font-mono text-duel-400 font-bold">+3</span> triggers a <strong>Nemesis Verification</strong>.</li>
            <li>Once designated as a Nemesis, the dominating operator claims a Dog Tag from the victim.</li>
            <li>To remove a Nemesis status, the victim must execute a <span className="font-mono text-nexus-400 font-bold">2-win streak</span> directly against the Nemesis.</li>
            <li>Challenges are rate-limited to 3 per 24 standard hours against any single operator.</li>
          </ul>
        </section>

        <section className="bg-steel-900 border border-steel-700/50 p-6 rounded-lg border-l-4 !border-l-threat-500">
          <h2 className="text-xl font-display font-bold text-threat-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldAlert size={20} /> 3. Verification & AI Oversight
          </h2>
          <p className="mb-4">
            Current Phase 3 deployment allows manual combat logging. At Phase 7, <strong>AI Verification Scanners</strong> will be enabled.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-ink-400">
            <li>Operators must capture post-combat telemetry (screenshots).</li>
            <li>The internal Gemini subnet will extract Win/Loss records and scores autonomously.</li>
            <li>Falsifying records during manual phase will result in total MMR wipe.</li>
          </ul>
        </section>

      </div>
    </div>
  )
}
