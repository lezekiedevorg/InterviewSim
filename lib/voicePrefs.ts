import {
  EDGE_SOLO_VOICES,
  EDGE_JURY_PACKS,
  DEFAULT_SOLO_VOICE_ID,
  DEFAULT_JURY_PACK_ID,
} from "./edgeVoices";

export type VoicePref = { soloId: string; packId: string };

const SOLO_KEY = "interviewsim.voice.solo";
const PACK_KEY = "interviewsim.voice.juryPack";

// Valide des valeurs brutes (localStorage) contre les catalogues connus ; inconnu → défaut.
export function resolveVoicePref(rawSolo: string | null, rawPack: string | null): VoicePref {
  const soloId = EDGE_SOLO_VOICES.some((v) => v.id === rawSolo) ? rawSolo! : DEFAULT_SOLO_VOICE_ID;
  const packId = EDGE_JURY_PACKS.some((p) => p.id === rawPack) ? rawPack! : DEFAULT_JURY_PACK_ID;
  return { soloId, packId };
}

export function getVoicePref(): VoicePref {
  // localStorage peut lever (WebView sandboxée, mode privé, SecurityError) — jamais planter le rendu.
  try {
    if (typeof window === "undefined") return resolveVoicePref(null, null);
    return resolveVoicePref(localStorage.getItem(SOLO_KEY), localStorage.getItem(PACK_KEY));
  } catch {
    return resolveVoicePref(null, null);
  }
}

export function setVoicePref(p: Partial<VoicePref>): void {
  try {
    if (typeof window === "undefined") return;
    if (p.soloId != null) localStorage.setItem(SOLO_KEY, p.soloId);
    if (p.packId != null) localStorage.setItem(PACK_KEY, p.packId);
  } catch {
    // stockage indisponible/plein : le choix ne sera pas mémorisé, sans casser l'entretien.
  }
}
