import { describe, it, expect } from "vitest";
import {
  POCKET_SOLO_VOICES,
  SOLO_VOICES,
  POCKET_VOICE_IDS,
  isPocketVoice,
  pocketVoiceId,
  soloVoiceById,
} from "../lib/pocketVoices";
import { EDGE_SOLO_VOICES, EDGE_SOLO_VOICE } from "../lib/edgeVoices";
import { resolveVoicePref } from "../lib/voicePrefs";

describe("pocketVoices", () => {
  it("la voix clonée ezekiel existe et ouvre la liste du sélecteur", () => {
    expect(POCKET_SOLO_VOICES[0].id).toBe("ezekiel");
    expect(SOLO_VOICES[0].id).toBe("ezekiel");
    expect(SOLO_VOICES[0].label).toContain("ivoirien");
  });
  it("toutes les voix pocket sont préfixées pocket: et les edge non", () => {
    for (const v of POCKET_SOLO_VOICES) expect(isPocketVoice(v.voice)).toBe(true);
    for (const v of EDGE_SOLO_VOICES) expect(isPocketVoice(v.voice)).toBe(false);
  });
  it("pocketVoiceId extrait l'id envoyé au Space", () => {
    expect(pocketVoiceId("pocket:ezekiel")).toBe("ezekiel");
    expect(POCKET_VOICE_IDS).toContain("ezekiel");
  });
  it("les ids de SOLO_VOICES sont uniques et contiennent edge + pocket", () => {
    const ids = SOLO_VOICES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("denise");
  });
  it("soloVoiceById résout pocket ET edge, repli sur le défaut historique", () => {
    expect(soloVoiceById("ezekiel")).toBe("pocket:ezekiel");
    expect(soloVoiceById("denise")).toBe("fr-FR-DeniseNeural");
    expect(soloVoiceById("inconnu")).toBe(EDGE_SOLO_VOICE);
  });
  it("resolveVoicePref accepte désormais un id pocket mémorisé", () => {
    expect(resolveVoicePref("ezekiel", null).soloId).toBe("ezekiel");
    expect(resolveVoicePref("nimporte", null).soloId).toBe("denise");
  });
});
