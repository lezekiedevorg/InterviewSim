import { Card } from "@/app/components/ui/Card";
import { ScoreBadge } from "@/app/components/ui/ScoreBadge";
import type { DrillReport } from "@/lib/drillReport";

export function DrillReportCard({ report, themeLabel }: { report: DrillReport; themeLabel: string }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-cream">{themeLabel}</h2>
        <ScoreBadge score={report.score} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ok">Points forts</h3>
          <ul className="list-disc pl-5 text-sm text-muted">{report.pointsForts.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
        <div>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">À travailler</h3>
          <ul className="list-disc pl-5 text-sm text-muted">{report.aTravailler.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      </div>
      {report.meilleureReponse && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3.5">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Ta réponse, en mieux</p>
          <p className="mb-1 text-xs italic text-faint line-through">{report.meilleureReponse.avant}</p>
          <p className="text-sm text-cream">{report.meilleureReponse.apres}</p>
        </div>
      )}
    </Card>
  );
}
