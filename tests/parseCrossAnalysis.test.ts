import { describe, it, expect } from "vitest";
import { parseCrossAnalysis } from "../lib/parseCrossAnalysis";

const valid = {
  pointsRecurrents: ["Réponses vagues : manque d'exemples concrets"],
  planAction: ["Préparer 3 exemples chiffrés"],
};

describe("parseCrossAnalysis", () => {
  it("parse un JSON brut valide", () => {
    expect(parseCrossAnalysis(JSON.stringify(valid))).toEqual(valid);
  });

  it("parse un JSON entouré d'un bloc markdown", () => {
    const raw = "```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseCrossAnalysis(raw)).toEqual(valid);
  });

  it("renvoie null si JSON invalide", () => {
    expect(parseCrossAnalysis("pas du json")).toBeNull();
  });

  it("renvoie null si un champ obligatoire manque", () => {
    const { planAction, ...incomplete } = valid;
    expect(parseCrossAnalysis(JSON.stringify(incomplete))).toBeNull();
  });

  it("renvoie null si un champ n'est pas un tableau", () => {
    expect(parseCrossAnalysis(JSON.stringify({ pointsRecurrents: "x", planAction: [] }))).toBeNull();
  });
});
