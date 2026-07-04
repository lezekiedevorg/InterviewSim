import type { PersonaId } from "./jury";

// Voix neuronales françaises d'edge-tts (Microsoft). Toutes gratuites, sans clé.
export const EDGE_SOLO_VOICE = "fr-FR-DeniseNeural";

export const EDGE_PERSONA_VOICE: Record<PersonaId, string> = {
  rh: "fr-FR-DeniseNeural",
  manager: "fr-FR-HenriNeural",
  expert: "fr-FR-VivienneMultilingualNeural",
};

// Liste blanche des voix acceptées par /api/tts (évite d'accepter n'importe quoi).
export const EDGE_VOICE_ALLOWLIST: string[] = Array.from(
  new Set([EDGE_SOLO_VOICE, ...Object.values(EDGE_PERSONA_VOICE)])
);
