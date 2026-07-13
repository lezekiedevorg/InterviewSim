import { describe, it, expect } from "vitest";
import { DIFFICULTES, difficulteBloc, difficulteLabel } from "../lib/difficulte";

describe("DIFFICULTES", () => {
  it("contient exactement 3 niveaux aux ids attendus", () => {
    expect(DIFFICULTES.map((d) => d.id)).toEqual(["detendu", "realiste", "sans-pitie"]);
  });
  it("chaque niveau a un libellé et une description non vides", () => {
    for (const d of DIFFICULTES) {
      expect(d.label.trim().length).toBeGreaterThan(0);
      expect(d.description.trim().length).toBeGreaterThan(0);
    }
  });
  it("réaliste est le seul niveau au bloc vide", () => {
    for (const d of DIFFICULTES) {
      if (d.id === "realiste") expect(d.bloc).toBe("");
      else expect(d.bloc.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("difficulteBloc", () => {
  it("sans argument → bloc vide (réaliste par défaut)", () => {
    expect(difficulteBloc()).toBe("");
    expect(difficulteBloc("realiste")).toBe("");
  });
  it("sans-pitie contient la consigne de coupure", () => {
    expect(difficulteBloc("sans-pitie")).toContain("ramener le candidat à l'essentiel");
  });
  it("detendu contient l'encouragement", () => {
    expect(difficulteBloc("detendu")).toContain("prenez votre temps");
  });
  it("id inconnu → réaliste (bloc vide)", () => {
    expect(difficulteBloc("nimporte-quoi")).toBe("");
  });
});

describe("difficulteLabel", () => {
  it("realiste, inconnu, undefined → null (rien à afficher)", () => {
    expect(difficulteLabel("realiste")).toBeNull();
    expect(difficulteLabel("nimporte")).toBeNull();
    expect(difficulteLabel(undefined)).toBeNull();
    expect(difficulteLabel(42)).toBeNull();
  });
  it("niveaux non réalistes → leur libellé", () => {
    expect(difficulteLabel("sans-pitie")).toBe("Sans pitié");
    expect(difficulteLabel("detendu")).toBe("Détendu");
  });
});
