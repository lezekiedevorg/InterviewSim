// Découpe un flux de texte en phrases prononçables, une à la fois.
// ponytail: coupe naïvement sur .!?…/newline ; "Node.js" ou "3.14" seront
// scindés (rare à l'oral, tolérable). Upgrade: regex tenant compte des abréviations si gênant.
export function nextSpeakableChunk(
  fullText: string,
  spokenLen: number
): { chunk: string; spokenLen: number } {
  const rest = fullText.slice(spokenLen);
  let boundary = -1;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === "." || c === "!" || c === "?" || c === "…" || c === "\n") {
      boundary = i;
      break;
    }
  }
  if (boundary === -1) return { chunk: "", spokenLen };
  const end = spokenLen + boundary + 1;
  return { chunk: fullText.slice(spokenLen, end).trim(), spokenLen: end };
}

// Combine le texte déjà tapé dans le champ avec le texte reconnu à la voix.
// ponytail: jointure par une seule espace ; suffisant pour du texte libre.
export function mergeTranscript(base: string, transcript: string): string {
  const t = transcript.trim();
  if (!t) return base;
  if (!base) return t;
  return base.replace(/\s+$/, "") + " " + t;
}

// Marqueurs dans le NOM de la voix (l'API speechSynthesis n'a pas de champ « qualité »).
const VOICE_QUALITY_HINTS = ["natural", "neural", "enhanced", "premium", "google", "siri", "online"];
const VOICE_LOW_HINTS = ["compact", "espeak", "hortense"];

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (VOICE_QUALITY_HINTS.some((h) => name.includes(h))) score += 2;
  if (VOICE_LOW_HINTS.some((h) => name.includes(h))) score -= 2;
  return score;
}

// Classe les voix françaises du navigateur, meilleures d'abord.
// ponytail: heuristique sur le nom faute de champ qualité dans l'API ; suffisant, ajustable.
export function rankFrenchVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith("fr"))
    .map((v, i) => ({ v, i, score: scoreVoice(v) }))
    .sort((a, b) => b.score - a.score || a.i - b.i) // score décroissant, stable à score égal
    .map((x) => x.v);
}
