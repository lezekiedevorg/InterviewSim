import { describe, it, expect } from "vitest";
import { parseDebrief } from "../lib/parseDebrief";
import { CRITERES, PLAFOND_SANS_PREUVE } from "../lib/score";

// Fixture v2 : les 5 critères notés 60 avec preuve → score global attendu 60.
const valid = {
  criteres: CRITERES.map((c) => ({
    id: c.id,
    note: 60,
    preuve: "J'ai livré le projet en trois semaines.",
    commentaire: "Réponse illustrée.",
  })),
  pointsForts: ["clair"],
  pointsATravailler: ["trop long"],
  reformulations: ["Version reformulée"],
  syntheseGenerale: "Bon entretien dans l'ensemble.",
};

describe("parseDebrief (JSON v2)", () => {
  it("parse un JSON valide et calcule le score global côté code", () => {
    const d = parseDebrief(JSON.stringify(valid));
    expect(d).not.toBeNull();
    expect(d!.scoreConfiance).toBe(60);
    expect(d!.criteres).toHaveLength(5);
    expect(d!.pointsForts).toEqual(["clair"]);
  });

  it("parse un JSON entouré d'un bloc markdown", () => {
    const raw = "```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseDebrief(raw)).not.toBeNull();
  });

  it("ignore un scoreConfiance fourni par le modèle (recalcule)", () => {
    const triche = { ...valid, scoreConfiance: 99 };
    expect(parseDebrief(JSON.stringify(triche))!.scoreConfiance).toBe(60);
  });

  it("plafonne un critère sans preuve", () => {
    const sansPreuve = {
      ...valid,
      criteres: valid.criteres.map((c) =>
        c.id === "concret" ? { ...c, note: 90, preuve: "" } : c
      ),
    };
    const d = parseDebrief(JSON.stringify(sansPreuve))!;
    const concret = d.criteres!.find((c) => c.id === "concret")!;
    expect(concret.note).toBe(PLAFOND_SANS_PREUVE);
  });

  it("renvoie null si JSON invalide", () => {
    expect(parseDebrief("pas du json")).toBeNull();
  });

  it("renvoie null si un critère de la grille manque", () => {
    const incomplet = { ...valid, criteres: valid.criteres.slice(1) };
    expect(parseDebrief(JSON.stringify(incomplet))).toBeNull();
  });

  it("renvoie null si criteres est absent (ancien format)", () => {
    const { criteres, ...ancien } = valid;
    expect(parseDebrief(JSON.stringify({ ...ancien, scoreConfiance: 72 }))).toBeNull();
  });

  it("renvoie null si un champ texte obligatoire manque", () => {
    const { syntheseGenerale, ...incomplet } = valid;
    expect(parseDebrief(JSON.stringify(incomplet))).toBeNull();
  });
});
