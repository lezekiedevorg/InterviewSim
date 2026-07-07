import type { SoloVoice } from "./edgeVoices";
import { EDGE_SOLO_VOICES, EDGE_SOLO_VOICE } from "./edgeVoices";

// Voix servies par le Space pocket-tts privé (voir hf-space/app.py, ids identiques).
// Le préfixe "pocket:" dans le champ voice est ce qui route /api/tts vers le Space
// au lieu d'edge-tts ; l'id nu (après le préfixe) est ce que le Space attend.
export const POCKET_PREFIX = "pocket:";

// ATTENTION : recopier ici la liste FINALE de la Task 2 (curation à l'écoute).
export const POCKET_SOLO_VOICES: SoloVoice[] = [
  { id: "ezekiel", label: "Ézéchiel · accent ivoirien 🇨🇮", voice: "pocket:ezekiel" },
  { id: "estelle", label: "Estelle (femme)", voice: "pocket:estelle" },
];

// Liste du sélecteur solo : la voix clonée d'abord (c'est l'argument du produit),
// puis les voix edge actuelles, puis les intégrées pocket retenues.
export const SOLO_VOICES: SoloVoice[] = [
  POCKET_SOLO_VOICES[0],
  ...EDGE_SOLO_VOICES,
  ...POCKET_SOLO_VOICES.slice(1),
];

export function isPocketVoice(voice: string): boolean {
  return voice.startsWith(POCKET_PREFIX);
}
export function pocketVoiceId(voice: string): string {
  return voice.slice(POCKET_PREFIX.length);
}
export const POCKET_VOICE_IDS: string[] = POCKET_SOLO_VOICES.map((v) => pocketVoiceId(v.voice));

// Remplace edgeVoices.soloVoiceById partout où le solo peut être une voix pocket.
export function soloVoiceById(id: string): string {
  return SOLO_VOICES.find((v) => v.id === id)?.voice ?? EDGE_SOLO_VOICE;
}
