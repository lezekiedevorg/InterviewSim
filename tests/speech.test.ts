import { describe, it, expect } from "vitest";
import { nextSpeakableChunk } from "../lib/speech";

describe("nextSpeakableChunk", () => {
  it("extrait la première phrase complète et avance l'offset", () => {
    const r = nextSpeakableChunk("Bonjour. Ca va?", 0);
    expect(r.chunk).toBe("Bonjour.");
    expect(r.spokenLen).toBe(8);
  });

  it("reprend à l'offset sans relire la phrase précédente", () => {
    const r = nextSpeakableChunk("Bonjour. Ca va?", 8);
    expect(r.chunk).toBe("Ca va?");
    expect(r.spokenLen).toBe(15);
  });

  it("ne renvoie rien tant que la phrase est incomplète", () => {
    const r = nextSpeakableChunk("Bonjour sans fin", 0);
    expect(r.chunk).toBe("");
    expect(r.spokenLen).toBe(0);
  });

  it("coupe aussi sur un retour à la ligne", () => {
    const r = nextSpeakableChunk("Ligne un\nLigne deux.", 0);
    expect(r.chunk).toBe("Ligne un");
    expect(r.spokenLen).toBe(9);
  });

  it("gère les points de suspension et exclamations", () => {
    expect(nextSpeakableChunk("Super !", 0).chunk).toBe("Super !");
    expect(nextSpeakableChunk("Attends…", 0).chunk).toBe("Attends…");
  });
});
