import { describe, it, expect } from "vitest";
import { encouragement } from "../lib/shareCard";

describe("encouragement", () => {
  it("≥80 → excellent (bornes 80 et 100)", () => {
    expect(encouragement(100)).toBe("Excellent, continue !");
    expect(encouragement(80)).toBe("Excellent, continue !");
  });
  it("60–79 → bien joué (bornes 60 et 79)", () => {
    expect(encouragement(79)).toBe("Bien joué 👏");
    expect(encouragement(60)).toBe("Bien joué 👏");
  });
  it("40–59 → en bonne voie (bornes 40 et 59)", () => {
    expect(encouragement(59)).toBe("En bonne voie 🚀");
    expect(encouragement(40)).toBe("En bonne voie 🚀");
  });
  it("<40 → chaque essai compte (bornes 39 et 0)", () => {
    expect(encouragement(39)).toBe("Chaque essai compte 💪");
    expect(encouragement(0)).toBe("Chaque essai compte 💪");
  });
});
