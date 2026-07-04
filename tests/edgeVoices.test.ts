import { describe, it, expect } from "vitest";
import { EDGE_SOLO_VOICE, EDGE_PERSONA_VOICE, EDGE_VOICE_ALLOWLIST } from "../lib/edgeVoices";

describe("edgeVoices", () => {
  it("a une voix par défaut pour le solo", () => {
    expect(typeof EDGE_SOLO_VOICE).toBe("string");
    expect(EDGE_SOLO_VOICE.length).toBeGreaterThan(0);
  });

  it("associe une voix DISTINCTE à chaque persona", () => {
    const voix = Object.values(EDGE_PERSONA_VOICE);
    expect(voix).toHaveLength(3);
    expect(new Set(voix).size).toBe(3); // toutes distinctes
  });

  it("l'allowlist contient la voix solo et les 3 voix de personas", () => {
    expect(EDGE_VOICE_ALLOWLIST).toContain(EDGE_SOLO_VOICE);
    for (const v of Object.values(EDGE_PERSONA_VOICE)) {
      expect(EDGE_VOICE_ALLOWLIST).toContain(v);
    }
  });
});
