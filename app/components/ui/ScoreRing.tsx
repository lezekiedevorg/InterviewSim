import { scoreColor } from "@/lib/scoreColor";

const strokeByColor: Record<string, string> = {
  rouge: "stroke-red-500",
  ambre: "stroke-amber-500",
  vert: "stroke-brand-500",
};
const textByColor: Record<string, string> = {
  rouge: "text-red-600",
  ambre: "text-amber-600",
  vert: "text-brand-700",
};

/** Jauge circulaire animée — le cercle se remplit jusqu'au score au chargement (CSS pur). */
export function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  // viewBox 36x36, r choisi pour une circonférence de ~100 : dashoffset = 100 - score.
  return (
    <div className="relative grid h-24 w-24 place-items-center" role="img" aria-label={`Score de confiance : ${score} sur 100`}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3.5" className="stroke-slate-200/70" />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={100 - score}
          className={`${strokeByColor[color]} animate-score-fill`}
        />
      </svg>
      <div className={`absolute inset-0 grid place-items-center ${textByColor[color]}`}>
        <span className="animate-scale-in text-2xl font-bold [animation-delay:.5s]">
          {score}
          <span className="text-xs font-medium opacity-60">/100</span>
        </span>
      </div>
    </div>
  );
}
