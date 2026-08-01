// Erreurs que `msedge-tts` émet HORS de toute requête : la websocket vers Microsoft se
// ferme (synthèse abandonnée, changement d'écran) et la lib crie sur un socket que la
// route ne référence plus. Impossible à attraper avec un try/catch autour de l'appel.
const SOCKET_NOISE = [
  "Edge TTS",
  "WebSocket",
  "aborted",
  "reading 'audio'",
  'reading "audio"',
];

/** Vrai si l'erreur est un bruit de socket Edge TTS, sans conséquence sur la requête. */
export function isTtsSocketNoise(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.message} ${err.cause ?? ""}` : String(err);
  return SOCKET_NOISE.some((s) => msg.includes(s));
}
