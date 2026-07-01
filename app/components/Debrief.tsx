import type { Debrief as DebriefType } from "@/lib/types";
import { Card } from "@/app/components/ui/Card";
import { ScoreBadge } from "@/app/components/ui/ScoreBadge";

export function Debrief({ data }: { data: DebriefType }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Débrief</h2>
          <ScoreBadge score={data.scoreConfiance} />
        </div>
        <p className="text-sm text-slate-600">{data.syntheseGenerale}</p>
      </Card>
      <Card>
        <h3 className="mb-2 font-heading font-semibold text-emerald-700">Points forts</h3>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          {data.pointsForts.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-heading font-semibold text-amber-700">À travailler</h3>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          {data.pointsATravailler.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-heading font-semibold text-slate-800">Reformulations suggérées</h3>
        <ul className="flex flex-col gap-2 text-sm text-slate-700">
          {data.reformulations.map((x, i) => <li key={i} className="rounded-lg bg-slate-50 p-2">{x}</li>)}
        </ul>
      </Card>
    </div>
  );
}
