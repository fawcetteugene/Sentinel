import type { AICommanderResponse } from '@/types'
import { SectionHeader } from '@/components/SectionHeader'
import { useCommanderQuery } from '@/lib/queries'

export function CommanderPage() {
  const briefingQuery = useCommanderQuery()
  const briefing = briefingQuery.data

  if (!briefing) {
    return <div className="p-6 text-slate-400">Loading AI commander briefing…</div>
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader eyebrow="AI Incident Commander" title="Operational briefing" description="Every recommendation is explained and grounded in current incident posture." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
          <div className="text-sm uppercase tracking-[0.35em] text-calm/80">Summary</div>
          <p className="mt-3 text-lg leading-8 text-slate-100">{briefing.summary}</p>
          <div className="mt-6 space-y-4">
            <Section title="Priorities" items={briefing.priorities} />
            <Section title="Responder allocation" items={briefing.responder_allocation} />
            <Section title="Action plan" items={briefing.action_plan} />
          </div>
        </div>
        <div className="space-y-6">
          <SectionPanel title="Resource shortages" items={briefing.resource_shortages} />
          <SectionPanel title="Escalation forecast" text={briefing.escalation_forecast} />
          <SectionPanel title="Evacuation advice" text={briefing.evacuation_advice} />
          <SectionPanel title="Situation report" text={briefing.situation_report} />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="text-sm font-semibold">Why this recommendation</div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {briefing.explanation.map((line) => (
                <div key={line} className="rounded-2xl bg-slate-950/70 p-3">{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SectionPanel({ title, text, items }: { title: string; text?: string; items?: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
      <div className="text-sm font-semibold">{title}</div>
      {text ? <div className="mt-3 text-sm leading-7 text-slate-300">{text}</div> : null}
      {items ? <ul className="mt-3 space-y-2 text-sm text-slate-300">{items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    </div>
  )
}
