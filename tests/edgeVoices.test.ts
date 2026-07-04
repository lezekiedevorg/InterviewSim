import { describe, it, expect } from "vitest";
import {
  EDGE_SOLO_VOICE,
  EDGE_PERSONA_VOICE,
  EDGE_VOICE_ALLOWLIST,
  EDGE_SOLO_VOICES,
  EDGE_JURY_PACKS,
  DEFAULT_SOLO_VOICE_ID,
  DEFAULT_JURY_PACK_ID,
  soloVoiceById,
  juryVoicesByPack,
} from "../lib/edgeVoices";

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

describe("edgeVoices — choix utilisateur", () => {
  it("propose au moins 2 voix solo, toutes dans l'allowlist", () => {
    expect(EDGE_SOLO_VOICES.length).toBeGreaterThanOrEqual(2);
    for (const v of EDGE_SOLO_VOICES) expect(EDGE_VOICE_ALLOWLIST).toContain(v.voice);
  });

  it("chaque pack jury a 3 voix DISTINCTES, toutes dans l'allowlist", () => {
    expect(EDGE_JURY_PACKS.length).toBeGreaterThanOrEqual(2);
    for (const p of EDGE_JURY_PACKS) {
      const voix = Object.values(p.voices);
      expect(voix).toHaveLength(3);
      expect(new Set(voix).size).toBe(3);
      for (const v of voix) expect(EDGE_VOICE_ALLOWLIST).toContain(v);
    }
  });

  it("les défauts pointent vers une entrée existante", () => {
    expect(EDGE_SOLO_VOICES.some((v) => v.id === DEFAULT_SOLO_VOICE_ID)).toBe(true);
    expect(EDGE_JURY_PACKS.some((p) => p.id === DEFAULT_JURY_PACK_ID)).toBe(true);
  });

  it("lookup par id, repli défaut si inconnu", () => {
    expect(soloVoiceById("henri")).toBe("fr-FR-HenriNeural");
    expect(soloVoiceById("inconnu")).toBe(EDGE_SOLO_VOICE);
    expect(juryVoicesByPack("inconnu")).toEqual(EDGE_PERSONA_VOICE);
  });
});
