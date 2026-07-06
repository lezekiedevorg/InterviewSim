import { describe, it, expect } from "vitest";
import {
  CRITERES,
  PLAFOND_SANS_PREUVE,
  MIN_REPONSES,
  capNote,
  computeScore,
  estTropCourt,
} from "../lib/score";
import type { CritereNote } from "../lib/types";
import type { ChatMessage } from "../lib/types";

function criteresAvecNote(note: number): CritereNote[] {
  return CRITERES.map((c) => ({ id: c.id, note, preuve: "citation", commentaire: "ok" }));
}

describe("CRITERES", () => {
  it("contient exactement 5 critères dont les poids somment à 100", () => {
    expect(CRITERES).toHaveLength(5);
    expect(CRITERES.reduce((s, c) => s + c.poids, 0)).toBe(100);
  });
});

describe("capNote", () => {
  it("borne la note dans [0, 100] et arrondit", () => {
    expect(capNote(-5, "preuve")).toBe(0);
    expect(capNote(112, "preuve")).toBe(100);
    expect(capNote(63.6, "preuve")).toBe(64);
  });
  it("plafonne à 40 quand la preuve est vide ou blanche", () => {
    expect(capNote(90, "")).toBe(PLAFOND_SANS_PREUVE);
    expect(capNote(90, "   ")).toBe(PLAFOND_SANS_PREUVE);
    expect(capNote(30, "")).toBe(30); // sous le plafond : inchangé
  });
  it("bornes exactes du plafond : 40 sans preuve reste 40, 0 négatif sans preuve reste 0", () => {
    expect(capNote(40, "")).toBe(40);
    expect(capNote(-5, "")).toBe(0);
  });
});

describe("computeScore", () => {
  it("fait la moyenne pondérée (toutes notes égales → cette note)", () => {
    expect(computeScore(criteresAvecNote(60))).toBe(60);
  });
  it("pondère selon les poids de la grille", () => {
    // structure 20×80, concret 25×40, adequation 20×60, communication 15×100, pression 20×50
    const criteres: CritereNote[] = [
      { id: "structure", note: 80, preuve: "p", commentaire: "" },
      { id: "concret", note: 40, preuve: "p", commentaire: "" },
      { id: "adequation", note: 60, preuve: "p", commentaire: "" },
      { id: "communication", note: 100, preuve: "p", commentaire: "" },
      { id: "pression", note: 50, preuve: "p", commentaire: "" },
    ];
    // (80*20 + 40*25 + 60*20 + 100*15 + 50*20) / 100 = (1600+1000+1200+1500+1000)/100 = 63
    expect(computeScore(criteres)).toBe(63);
  });
  it("compte 0 pour un critère absent de la liste", () => {
    const sansConcret = criteresAvecNote(100).filter((c) => c.id !== "concret");
    // 100 partout sauf concret (poids 25) à 0 → 75
    expect(computeScore(sansConcret)).toBe(75);
  });
  it("en cas d'ID dupliqué, la première occurrence gagne", () => {
    const doublon: CritereNote[] = [
      ...criteresAvecNote(60),
      { id: "concret", note: 100, preuve: "p", commentaire: "" },
    ];
    expect(computeScore(doublon)).toBe(60);
  });
  it("re-borne une note hors limites passée sans capNote", () => {
    const triche = criteresAvecNote(60).map((c) =>
      c.id === "concret" ? { ...c, note: 999 } : c
    );
    // concret compté 100 au lieu de 999 : 60*75/100 + 100*25/100 = 70
    expect(computeScore(triche)).toBe(70);
  });
  it("liste vide → 0", () => {
    expect(computeScore([])).toBe(0);
  });
});

describe("estTropCourt", () => {
  const r = (text: string): ChatMessage => ({ role: "recruiter", text });
  const c = (text: string): ChatMessage => ({ role: "candidate", text });

  it("vrai sous MIN_REPONSES réponses candidat non vides", () => {
    expect(MIN_REPONSES).toBe(3);
    expect(estTropCourt([r("Bonjour"), c("Bonjour"), r("Parcours ?"), c("Je suis dev.")])).toBe(true);
  });
  it("faux à partir de 3 réponses candidat", () => {
    expect(
      estTropCourt([r("q1"), c("r1"), r("q2"), c("r2"), r("q3"), c("r3")])
    ).toBe(false);
  });
  it("ignore les réponses candidat vides ou blanches", () => {
    expect(estTropCourt([c("r1"), c("   "), c("r2"), c("")])).toBe(true);
  });
  it("transcript vide → trop court", () => {
    expect(estTropCourt([])).toBe(true);
  });
});
