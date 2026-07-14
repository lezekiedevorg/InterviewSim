import { DRILL_THEMES, type DrillThemeId } from "./drillThemes";

export type DrillRow = { theme: string; score: number; created_at: string };

export function masteryByTheme(
  rows: DrillRow[],
  window = 5
): { theme: DrillThemeId; label: string; mastery: number; count: number }[] {
  return DRILL_THEMES.flatMap((t) => {
    const scores = rows
      .filter((r) => r.theme === t.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)) // plus récent d'abord
      .slice(0, window)
      .map((r) => r.score);
    if (scores.length === 0) return [];
    const mastery = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    return [{ theme: t.id, label: t.label, mastery, count: scores.length }];
  });
}
