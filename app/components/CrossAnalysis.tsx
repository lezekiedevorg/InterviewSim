import type { CrossAnalysis as CrossAnalysisType } from "@/lib/types";
import { Card } from "@/app/components/ui/Card";

export function CrossAnalysis({ data }: { data: CrossAnalysisType }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-l-4 border-l-amber-500">
        <h3 className="mb-2 flex items-center gap-2 font-heading font-semibold text-amber-700">
          <span aria-hidden>↻</span> Points faibles récurrents
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.pointsRecurrents.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
      <Card className="border-l-4 border-l-emerald-500">
        <h3 className="mb-2 flex items-center gap-2 font-heading font-semibold text-emerald-700">
          <span aria-hidden>◎</span> Plan d&apos;action
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.planAction.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
    </div>
  );
}
