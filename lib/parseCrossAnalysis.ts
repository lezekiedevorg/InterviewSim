import type { CrossAnalysis } from "./types";

export function parseCrossAnalysis(raw: string): CrossAnalysis | null {
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

  if (!Array.isArray(d.pointsRecurrents) || !Array.isArray(d.planAction)) {
    return null;
  }

  return {
    pointsRecurrents: d.pointsRecurrents as string[],
    planAction: d.planAction as string[],
  };
}
