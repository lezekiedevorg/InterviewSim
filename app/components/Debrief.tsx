import type { Debrief as DebriefType } from "@/lib/types";
import { Card } from "@/app/components/ui/Card";
import { ScoreRing } from "@/app/components/ui/ScoreRing";

export function Debrief({ data }: { data: DebriefType }) {
  return (
    <div className="stagger flex flex-col gap-4">
      <Card className="border-brand-200/70 bg-gradient-to-br from-brand-50/90 to-white/90">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ton débrief</p>
            <h2 className="font-heading text-xl font-bold text-slate-900">Synthèse de l&apos;entretien</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{data.syntheseGenerale}</p>
          </div>
          <div className="shrink-0">
            <ScoreRing score={data.scoreConfiance} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-l-4 border-l-brand-500">
          <h3 className="mb-2 flex items-center gap-2 font-heading font-semibold text-brand-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Points forts
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {data.pointsForts.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <h3 className="mb-2 flex items-center gap-2 font-heading font-semibold text-amber-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <line x1="7" x2="17" y1="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
            À travailler
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {data.pointsATravailler.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-heading font-semibold text-slate-800">Reformulations suggérées</h3>
        <ul className="flex flex-col gap-2 text-sm text-slate-700">
          {data.reformulations.map((x, i) => (
            <li key={i} className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 leading-relaxed">{x}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
