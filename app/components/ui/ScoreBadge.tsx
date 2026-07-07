import { scoreColor } from "@/lib/scoreColor";

// Pilule pleine à la couleur de la bande, texte nuit — comme la maquette « Studio nuit ».
const classes: Record<string, string> = {
  rouge: "bg-danger-400",
  ambre: "bg-amber-400",
  vert: "bg-ok",
};

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex min-w-[44px] items-center justify-center rounded-full px-2.5 py-1 font-heading text-[15px] font-extrabold text-night-900 ${classes[scoreColor(score)]}`}
    >
      {score}
    </span>
  );
}
