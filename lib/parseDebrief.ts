import type { Debrief, CritereNote } from "./types";
import { CRITERES, capNote, computeScore } from "./score";

export function parseDebrief(raw: string): Debrief | null {
  // Retire un éventuel bloc markdown ```json ... ```
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (typeof obj !== "object" || obj === null) return null;
  const d = obj as Record<string, unknown>;

  if (
    !Array.isArray(d.pointsForts) ||
    !Array.isArray(d.pointsATravailler) ||
    !Array.isArray(d.reformulations) ||
    typeof d.syntheseGenerale !== "string" ||
    !Array.isArray(d.criteres)
  ) {
    return null;
  }

  // Les 5 critères de la grille sont exigés ; note bornée + plafonnée par capNote.
  const bruts = d.criteres as Record<string, unknown>[];
  const criteres: CritereNote[] = [];
  for (const c of CRITERES) {
    const trouve = bruts.find((x) => x && typeof x === "object" && x.id === c.id);
    if (!trouve || typeof trouve.note !== "number") return null;
    const preuve = typeof trouve.preuve === "string" ? trouve.preuve : "";
    const commentaire = typeof trouve.commentaire === "string" ? trouve.commentaire : "";
    criteres.push({ id: c.id, note: capNote(trouve.note, preuve), preuve, commentaire });
  }

  return {
    pointsForts: d.pointsForts as string[],
    pointsATravailler: d.pointsATravailler as string[],
    reformulations: d.reformulations as string[],
    criteres,
    // Le score global vient de NOTRE calcul, jamais du modèle.
    scoreConfiance: computeScore(criteres),
    syntheseGenerale: d.syntheseGenerale,
  };
}
