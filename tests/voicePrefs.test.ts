import { describe, it, expect } from "vitest";
import { resolveVoicePref } from "../lib/voicePrefs";
import { DEFAULT_SOLO_VOICE_ID, DEFAULT_JURY_PACK_ID } from "../lib/edgeVoices";

describe("resolveVoicePref", () => {
  it("null → défauts", () => {
    expect(resolveVoicePref(null, null)).toEqual({
      soloId: DEFAULT_SOLO_VOICE_ID,
      packId: DEFAULT_JURY_PACK_ID,
    });
  });

  it("valeurs connues → conservées", () => {
    expect(resolveVoicePref("henri", "pack2")).toEqual({ soloId: "henri", packId: "pack2" });
  });

  it("valeurs inconnues/corrompues → défauts", () => {
    expect(resolveVoicePref("bidon", "xxx")).toEqual({
      soloId: DEFAULT_SOLO_VOICE_ID,
      packId: DEFAULT_JURY_PACK_ID,
    });
  });
});
