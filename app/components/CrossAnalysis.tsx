import type { CrossAnalysis as CrossAnalysisType } from "@/lib/types";
import { Card } from "@/app/components/ui/Card";

export function CrossAnalysis({ data }: { data: CrossAnalysisType }) {
  return (
    <div className="stagger flex flex-col gap-3.5">
      <Card className="flex flex-col gap-3">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          Points faibles récurrents
        </span>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-snug text-cream">
          {data.pointsRecurrents.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
      <Card className="flex flex-col gap-3">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
          Plan d&apos;action
        </span>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-snug text-cream">
          {data.planAction.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
    </div>
  );
}
