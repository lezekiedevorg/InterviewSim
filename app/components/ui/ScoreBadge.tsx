import { scoreColor } from "@/lib/scoreColor";

const classes: Record<string, string> = {
  rouge: "bg-red-50 text-red-700 ring-red-600/20",
  ambre: "bg-amber-50 text-amber-700 ring-amber-600/20",
  vert: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded-full px-3 py-1 text-sm font-bold ring-1 ring-inset ${classes[scoreColor(score)]}`}
    >
      {score}
      <span className="text-xs font-medium opacity-70">/100</span>
    </span>
  );
}
