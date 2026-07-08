import { describe, it, expect } from "vitest";
import { createVoiceGate } from "../lib/voiceGate";

describe("createVoiceGate", () => {
  it("ne déclenche pas sur un pic isolé plus court que sustainMs", () => {
    const g = createVoiceGate(0.06, 150);
    expect(g.feed(0.2, 0)).toBe(false);   // au-dessus du seuil, t=0
    expect(g.feed(0.2, 100)).toBe(false); // 100 ms < 150 ms
    expect(g.feed(0.0, 120)).toBe(false); // retombe sous le seuil → réarme
    expect(g.feed(0.0, 300)).toBe(false);
  });

  it("déclenche une seule fois quand le volume tient au-delà de sustainMs", () => {
    const g = createVoiceGate(0.06, 150);
    expect(g.feed(0.2, 0)).toBe(false);
    expect(g.feed(0.2, 150)).toBe(true);  // franchissement
    expect(g.feed(0.2, 200)).toBe(false); // déjà déclenché, pas de re-tir
    expect(g.feed(0.2, 400)).toBe(false);
  });

  it("réarme après être retombé sous le seuil, puis peut re-déclencher", () => {
    const g = createVoiceGate(0.06, 150);
    g.feed(0.2, 0);
    expect(g.feed(0.2, 150)).toBe(true);
    expect(g.feed(0.0, 160)).toBe(false); // silence → réarme
    expect(g.feed(0.2, 200)).toBe(false); // nouveau départ du compteur
    expect(g.feed(0.2, 350)).toBe(true);  // re-franchissement
  });

  it("reset() efface l'état en cours (pas de tir résiduel)", () => {
    const g = createVoiceGate(0.06, 150);
    g.feed(0.2, 0);
    g.reset();
    expect(g.feed(0.2, 100)).toBe(false); // le compteur est reparti de 100
    expect(g.feed(0.2, 250)).toBe(true);
  });

  it("un volume juste sous le seuil ne compte pas", () => {
    const g = createVoiceGate(0.06, 150);
    expect(g.feed(0.05, 0)).toBe(false);
    expect(g.feed(0.05, 500)).toBe(false);
  });
});
