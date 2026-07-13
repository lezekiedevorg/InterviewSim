import { describe, it, expect } from "vitest";
import { FILLERS, pickFiller, shouldFill } from "../lib/filler";

describe("pickFiller", () => {
  it("tire un élément du pool", () => {
    expect(FILLERS).toContain(pickFiller(() => 0));
    expect(FILLERS).toContain(pickFiller(() => 0.99));
    expect(pickFiller(() => 0)).toBe(FILLERS[0]);
  });
});

describe("shouldFill", () => {
  const base = {
    streaming: true,
    prevStreaming: false,
    jury: false,
    muted: false,
    ready: true,
    hasCandidateTurn: true,
  };
  it("front montant de streaming en réponse à un candidat → oui", () => {
    expect(shouldFill(base)).toBe(true);
  });
  it("streaming déjà actif (pas un front) → non", () => {
    expect(shouldFill({ ...base, prevStreaming: true })).toBe(false);
  });
  it("question d'ouverture (aucun tour candidat) → non", () => {
    expect(shouldFill({ ...base, hasCandidateTurn: false })).toBe(false);
  });
  it("mode jury → non (plusieurs voix)", () => {
    expect(shouldFill({ ...base, jury: true })).toBe(false);
  });
  it("muet ou moteur pas prêt → non", () => {
    expect(shouldFill({ ...base, muted: true })).toBe(false);
    expect(shouldFill({ ...base, ready: false })).toBe(false);
  });
});
