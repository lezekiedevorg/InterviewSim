export function scoreColor(score: number): "rouge" | "ambre" | "vert" {
  if (score < 40) return "rouge";
  if (score < 70) return "ambre";
  return "vert";
}

// Couleurs des bandes de score, charte « Studio nuit ».
export const BAND_HEX: Record<ReturnType<typeof scoreColor>, string> = {
  rouge: "#ff5a4e",
  ambre: "#ffb224",
  vert: "#34d27b",
};

// Verdict en un mot, calé sur les mêmes bandes.
export function verdict(score: number): string {
  if (score >= 70) return "Solide.";
  if (score >= 40) return "En progrès.";
  return "On remet ça.";
}
