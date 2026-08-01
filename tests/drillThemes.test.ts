import { describe, it, expect } from "vitest";
import { DRILL_THEMES, drillTheme, drillThemeBloc } from "../lib/drillThemes";

describe("drillThemes", () => {
  it("expose 7 thèmes aux ids stables", () => {
    expect(DRILL_THEMES).toHaveLength(7);
    expect(DRILL_THEMES.map((t) => t.id)).toEqual([
      "pitch", "motivation", "comportemental", "situation", "pieges", "technique", "nego",
    ]);
  });
  it("drillTheme trouve par id, undefined si inconnu", () => {
    expect(drillTheme("nego")?.label).toContain("Négociation");
    expect(drillTheme("xxx")).toBeUndefined();
    expect(drillTheme()).toBeUndefined();
  });
  it("drillThemeBloc renvoie le bloc ou une chaîne vide", () => {
    expect(drillThemeBloc("pieges").length).toBeGreaterThan(0);
    expect(drillThemeBloc("xxx")).toBe("");
    expect(drillThemeBloc()).toBe("");
  });
  it("chaque bloc décrit le type de questions (non vide)", () => {
    for (const t of DRILL_THEMES) expect(t.bloc.trim().length).toBeGreaterThan(0);
  });
});
