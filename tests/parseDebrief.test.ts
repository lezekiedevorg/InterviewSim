import { describe, it, expect } from "vitest";
import { parseDebrief } from "../lib/parseDebrief";

const valid = {
  pointsForts: ["clair"],
  pointsATravailler: ["trop long"],
  reformulations: ["Version reformulée"],
  scoreConfiance: 72,
  syntheseGenerale: "Bon entretien dans l'ensemble.",
};

describe("parseDebrief", () => {
  it("parse un JSON brut valide", () => {
    expect(parseDebrief(JSON.stringify(valid))).toEqual(valid);
  });

  it("parse un JSON entouré d'un bloc markdown", () => {
    const raw = "```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseDebrief(raw)).toEqual(valid);
  });

  it("renvoie null si JSON invalide", () => {
    expect(parseDebrief("pas du json")).toBeNull();
  });

  it("renvoie null si un champ obligatoire manque", () => {
    const { scoreConfiance, ...incomplete } = valid;
    expect(parseDebrief(JSON.stringify(incomplete))).toBeNull();
  });
});
