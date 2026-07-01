import { scoreColor } from "@/lib/scoreColor";

const classes: Record<string, string> = {
  rouge: "bg-red-100 text-red-700",
  ambre: "bg-amber-100 text-amber-700",
  vert: "bg-emerald-100 text-emerald-700",
};

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${classes[scoreColor(score)]}`}
    >
      {score}/100
    </span>
  );
}
