import { describe, it, expect } from "vitest";
import { TEMPLATES } from "../lib/templates";

describe("TEMPLATES", () => {
  it("contient au moins 6 scénarios", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });

  it("a des id uniques", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a un poste non vide pour chaque template", () => {
    for (const t of TEMPLATES) {
      expect(t.context.poste.trim().length).toBeGreaterThan(0);
    }
  });

  it("a un titre et un emoji pour chaque template", () => {
    for (const t of TEMPLATES) {
      expect(t.emoji.length).toBeGreaterThan(0);
      expect(t.titre.trim().length).toBeGreaterThan(0);
    }
  });
});
