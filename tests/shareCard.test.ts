import { describe, it, expect } from "vitest";
import { verdict, BAND_HEX, scoreColor } from "../lib/scoreColor";

// Le verdict et les couleurs de bande sont partagés entre le débrief et la carte de partage.
describe("verdict", () => {
  it("≥70 → Solide. (bornes 70 et 100)", () => {
    expect(verdict(100)).toBe("Solide.");
    expect(verdict(70)).toBe("Solide.");
  });
  it("40–69 → En progrès. (bornes 40 et 69)", () => {
    expect(verdict(69)).toBe("En progrès.");
    expect(verdict(40)).toBe("En progrès.");
  });
  it("<40 → On remet ça. (bornes 39 et 0)", () => {
    expect(verdict(39)).toBe("On remet ça.");
    expect(verdict(0)).toBe("On remet ça.");
  });
});

describe("BAND_HEX", () => {
  it("couvre les trois bandes avec les couleurs Studio nuit", () => {
    expect(BAND_HEX[scoreColor(20)]).toBe("#ff5a4e");
    expect(BAND_HEX[scoreColor(50)]).toBe("#ffb224");
    expect(BAND_HEX[scoreColor(85)]).toBe("#34d27b");
  });
});
