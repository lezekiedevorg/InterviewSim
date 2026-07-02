import type { Debrief as DebriefType } from "@/lib/types";
import { Card } from "@/app/components/ui/Card";
import { ScoreBadge } from "@/app/components/ui/ScoreBadge";

export function Debrief({ data }: { data: DebriefType }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ton débrief</p>
            <h2 className="font-heading text-xl font-bold text-slate-900">Synthèse de l&apos;entretien</h2>
          </div>
          <ScoreBadge score={data.scoreConfiance} />
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{data.syntheseGenerale}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-l-4 border-l-emerald-500">
          <h3 className="mb-2 flex items-center gap-2 font-heading font-semibold text-emerald-700">
            <span aria-hidden>✓</span> Points forts
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {data.pointsForts.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <h3 className="mb-2 flex items-center gap-2 font-heading font-semibold text-amber-700">
            <span aria-hidden>↗</span> À travailler
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
            <li key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 leading-relaxed">{x}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
