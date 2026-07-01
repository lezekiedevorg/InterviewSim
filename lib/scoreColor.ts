export function scoreColor(score: number): "rouge" | "ambre" | "vert" {
  if (score < 40) return "rouge";
  if (score < 70) return "ambre";
  return "vert";
}
