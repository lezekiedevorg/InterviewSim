import type { PersonaId } from "./jury";

// Voix neuronales françaises d'edge-tts (Microsoft). Toutes gratuites, sans clé.
export const EDGE_SOLO_VOICE = "fr-FR-DeniseNeural"; // défaut historique

export const EDGE_PERSONA_VOICE: Record<PersonaId, string> = {
  rh: "fr-FR-DeniseNeural",
  manager: "fr-FR-HenriNeural",
  expert: "fr-FR-VivienneMultilingualNeural",
};

// Voix solo proposées à l'utilisateur : id stable (localStorage), libellé UI, voix edge.
export type SoloVoice = { id: string; label: string; voice: string };
export const EDGE_SOLO_VOICES: SoloVoice[] = [
  { id: "denise", label: "Denise (femme)", voice: "fr-FR-DeniseNeural" },
  { id: "henri", label: "Henri (homme)", voice: "fr-FR-HenriNeural" },
  { id: "vivienne", label: "Vivienne (femme)", voice: "fr-FR-VivienneMultilingualNeural" },
  { id: "remy", label: "Rémy (homme)", voice: "fr-FR-RemyMultilingualNeural" },
];
export const DEFAULT_SOLO_VOICE_ID = "denise";

// Packs de jury : chaque pack = 3 voix DISTINCTES (une par persona), pour garder les personas différenciés.
export type JuryPack = { id: string; label: string; voices: Record<PersonaId, string> };
export const EDGE_JURY_PACKS: JuryPack[] = [
  { id: "pack1", label: "Pack 1 (par défaut)", voices: { ...EDGE_PERSONA_VOICE } },
  {
    id: "pack2",
    label: "Pack 2",
    voices: {
      rh: "fr-FR-EloiseNeural",
      manager: "fr-FR-RemyMultilingualNeural",
      expert: "fr-FR-VivienneMultilingualNeural",
    },
  },
];
export const DEFAULT_JURY_PACK_ID = "pack1";

// Recherche par id, repli sur le défaut historique si l'id est inconnu.
export function soloVoiceById(id: string): string {
  return EDGE_SOLO_VOICES.find((v) => v.id === id)?.voice ?? EDGE_SOLO_VOICE;
}
export function juryVoicesByPack(id: string): Record<PersonaId, string> {
  return EDGE_JURY_PACKS.find((p) => p.id === id)?.voices ?? EDGE_PERSONA_VOICE;
}

// Liste blanche acceptée par /api/tts = union de tout ce qu'on peut demander.
export const EDGE_VOICE_ALLOWLIST: string[] = Array.from(
  new Set([
    EDGE_SOLO_VOICE,
    ...Object.values(EDGE_PERSONA_VOICE),
    ...EDGE_SOLO_VOICES.map((v) => v.voice),
    ...EDGE_JURY_PACKS.flatMap((p) => Object.values(p.voices)),
  ])
);
