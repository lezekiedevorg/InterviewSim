import type { DrillReport } from "./drillReport";

export function parseDrillReport(raw: string): DrillReport | null {
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
    typeof d.score !== "number" ||
    !Array.isArray(d.pointsForts) ||
    !Array.isArray(d.aTravailler)
  ) {
    return null;
  }

  let meilleureReponse: DrillReport["meilleureReponse"] = null;
  const m = d.meilleureReponse;
  if (m && typeof m === "object") {
    const mm = m as Record<string, unknown>;
    if (typeof mm.question === "string" && typeof mm.avant === "string" && typeof mm.apres === "string") {
      meilleureReponse = { question: mm.question, avant: mm.avant, apres: mm.apres };
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(d.score))),
    pointsForts: (d.pointsForts as unknown[]).filter((x): x is string => typeof x === "string"),
    aTravailler: (d.aTravailler as unknown[]).filter((x): x is string => typeof x === "string"),
    meilleureReponse,
  };
}
