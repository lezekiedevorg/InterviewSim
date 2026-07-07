import type { Debrief as DebriefType } from "@/lib/types";
import { Card } from "@/app/components/ui/Card";
import { ScoreRing } from "@/app/components/ui/ScoreRing";
import { verdict, scoreColor, BAND_HEX } from "@/lib/scoreColor";
import { CRITERES } from "@/lib/score";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-[15px] w-[15px] shrink-0" aria-hidden>
      <polyline points="4 12.5 9.5 18 20 6" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-[15px] w-[15px] shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export function Debrief({ data }: { data: DebriefType }) {
  return (
    <div className="stagger flex flex-col items-center gap-4">
      {/* La jauge : le moment récompense */}
      <div className="flex flex-col items-center pt-2 text-center">
        <ScoreRing score={data.scoreConfiance} />
        <h2 className="mt-5 font-heading text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
          {verdict(data.scoreConfiance)}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted [text-wrap:pretty]">
          {data.syntheseGenerale}
        </p>
      </div>

      {/* Détail de la note — présent uniquement sur les débriefs notés avec la grille */}
      {data.criteres && data.criteres.length > 0 && (
        <Card className="flex w-full flex-col gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
            Détail de la note
          </span>
          {data.criteres.map((c) => {
            const label = CRITERES.find((x) => x.id === c.id)?.label ?? c.id;
            const hex = BAND_HEX[scoreColor(c.note)];
            return (
              <div key={c.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-cream">{label}</span>
                  <span className="font-heading text-[15px] font-extrabold" style={{ color: hex }}>
                    {c.note}
                    <span className="ml-0.5 text-[10px] font-medium text-faint">/100</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${c.note}%`, background: hex }}
                  />
                </div>
                {c.commentaire && (
                  <p className="text-[13px] leading-snug text-muted">{c.commentaire}</p>
                )}
                {c.preuve && (
                  <p className="border-l-2 border-cream/15 pl-2.5 text-xs italic leading-snug text-faint">
                    «&nbsp;{c.preuve}&nbsp;»
                  </p>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <div className="grid w-full gap-3.5 sm:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ok">
            Points forts
          </span>
          {data.pointsForts.map((x, i) => (
            <div key={i} className="flex items-start gap-2.5 text-ok">
              <CheckIcon />
              <span className="text-sm leading-snug text-cream">{x}</span>
            </div>
          ))}
        </Card>
        <Card className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">
            À travailler
          </span>
          {data.pointsATravailler.map((x, i) => (
            <div key={i} className="flex items-start gap-2.5 text-amber-400">
              <TargetIcon />
              <span className="text-sm leading-snug text-cream">{x}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card className="flex w-full flex-col gap-3.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
          Reformulations suggérées
        </span>
        {data.reformulations.map((x, i) => (
          <p key={i} className="border-l-2 border-amber-400/50 pl-3 text-sm leading-relaxed text-cream">
            {x}
          </p>
        ))}
      </Card>
    </div>
  );
}
