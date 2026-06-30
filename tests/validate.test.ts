import { describe, it, expect } from "vitest";
import { validateContext } from "../lib/validate";

describe("validateContext", () => {
  it("accepte un contexte avec poste et cv", () => {
    expect(validateContext({ poste: "Dev", cv: "mon cv" })).toEqual([]);
  });

  it("rejette un poste manquant", () => {
    expect(validateContext({ poste: "", cv: "mon cv" })).toContain(
      "Le poste visé est obligatoire."
    );
  });

  it("rejette un CV manquant", () => {
    expect(validateContext({ poste: "Dev", cv: "  " })).toContain(
      "Le CV est obligatoire."
    );
  });

  it("rejette les deux manquants", () => {
    expect(validateContext({}).length).toBe(2);
  });
});
