import { scoreColor } from "@/lib/scoreColor";

// Bandes de score « Studio nuit » : rouge < 40, ambre < 70, vert ≥ 70.
export const BAND_HEX: Record<string, string> = {
  rouge: "#ff5a4e",
  ambre: "#ffb224",
  vert: "#34d27b",
};

/** Grande jauge circulaire animée — le trait se remplit jusqu'au score au chargement (CSS pur). */
export function ScoreRing({ score }: { score: number }) {
  const hex = BAND_HEX[scoreColor(score)];
  // r = 54 → circonférence ≈ 339.3 ; dashoffset = 339.3 × (1 - score/100).
  return (
    <div
      className="relative h-[180px] w-[180px]"
      role="img"
      aria-label={`Score de confiance : ${score} sur 100`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" stroke="rgba(242,239,228,0.1)" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke={hex}
          strokeDasharray="339.3"
          strokeDashoffset={(339.3 * (1 - score / 100)).toFixed(1)}
          className="animate-score-fill"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-[52px] font-extrabold leading-none" style={{ color: hex }}>
          {score}
        </span>
        <span className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-faint">
          Score / 100
        </span>
      </div>
    </div>
  );
}
