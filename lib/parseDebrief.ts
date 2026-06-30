import type { Debrief } from "./types";

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
    typeof d.scoreConfiance !== "number" ||
    typeof d.syntheseGenerale !== "string"
  ) {
    return null;
  }

  return {
    pointsForts: d.pointsForts as string[],
    pointsATravailler: d.pointsATravailler as string[],
    reformulations: d.reformulations as string[],
    scoreConfiance: d.scoreConfiance,
    syntheseGenerale: d.syntheseGenerale,
  };
}
