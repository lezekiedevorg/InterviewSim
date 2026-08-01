import { describe, it, expect } from "vitest";
import { masteryByTheme } from "../lib/drillMastery";

const row = (theme: string, score: number, d: string) => ({ theme, score, created_at: d });

describe("masteryByTheme", () => {
  it("moyenne glissante sur les N derniers, thèmes entamés seulement", () => {
    const rows = [
      row("pitch", 40, "2026-01-01"),
      row("pitch", 80, "2026-01-02"),
      row("nego", 60, "2026-01-03"),
    ];
    const m = masteryByTheme(rows, 5);
    expect(m.map((x) => x.theme)).toEqual(["pitch", "nego"]); // ordre de DRILL_THEMES
    expect(m.find((x) => x.theme === "pitch")!.mastery).toBe(60); // (40+80)/2
    expect(m.find((x) => x.theme === "pitch")!.count).toBe(2);
  });
  it("ne garde que la fenêtre des N derniers scores (par date desc)", () => {
    const rows = [
      row("pitch", 100, "2026-01-01"),
      row("pitch", 0, "2026-01-02"),
      row("pitch", 0, "2026-01-03"),
    ];
    // window=2 → deux plus récents : (0+0)/2 = 0
    expect(masteryByTheme(rows, 2).find((x) => x.theme === "pitch")!.mastery).toBe(0);
  });
  it("aucun drill → tableau vide", () => {
    expect(masteryByTheme([], 5)).toEqual([]);
  });
  it("ignore les thèmes inconnus", () => {
    expect(masteryByTheme([row("xxx", 90, "2026-01-01")], 5)).toEqual([]);
  });
});
