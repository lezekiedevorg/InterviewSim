import { describe, it, expect } from "vitest";
import { validateContext } from "../lib/validate";

describe("validateContext", () => {
  it("accepte un contexte avec poste et cv", () => {
    expect(validateContext({ poste: "Dev", cv: "mon cv" })).toEqual([]);
  });

  it("accepte un contexte sans CV (CV optionnel)", () => {
    expect(validateContext({ poste: "Dev", cv: "" })).toEqual([]);
  });

  it("rejette un poste manquant", () => {
    expect(validateContext({ poste: "", cv: "mon cv" })).toContain(
      "Le poste visé est obligatoire."
    );
  });

  it("ne renvoie que l'erreur poste quand tout est vide", () => {
    expect(validateContext({})).toEqual(["Le poste visé est obligatoire."]);
  });
});
