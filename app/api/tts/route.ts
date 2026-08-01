import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { EDGE_VOICE_ALLOWLIST } from "@/lib/edgeVoices";
import { isTtsSocketNoise } from "@/lib/ttsNoise";

export const runtime = "nodejs";

const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;

// ponytail: garde-fou process, posé une seule fois. Les erreurs de socket d'Edge TTS
// surviennent hors requête → sans ça Node tue l'instance (et les requêtes en vol avec).
// On avale UNIQUEMENT ce bruit-là ; toute autre erreur repart et fait tomber le process
// comme avant. À supprimer si msedge-tts finit par gérer ses propres sockets.
const g = globalThis as typeof globalThis & { __ttsGuard?: boolean };
if (!g.__ttsGuard) {
  g.__ttsGuard = true;
  const swallow = (err: unknown) => {
    if (isTtsSocketNoise(err)) {
      console.warn("[tts] erreur de socket ignorée :", err instanceof Error ? err.message : err);
      return;
    }
    throw err;
  };
  process.on("uncaughtException", swallow);
  process.on("unhandledRejection", swallow);
}

// ponytail: cache d'instances Edge TTS par voix — évite de rouvrir la websocket vers
// Microsoft (~644 ms mesurés) à chaque phrase. Concurrence OK : msedge multiplexe par
// requestId sur une même socket. La socket peut expirer côté Microsoft entre deux tours ;
// on le détecte (audio vide) et on recrée l'instance une fois (cf. synthesize).
const pool = new Map<string, Promise<MsEdgeTTS>>();

function getTts(voice: string): Promise<MsEdgeTTS> {
  let p = pool.get(voice);
  if (!p) {
    p = (async () => {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, FORMAT);
      return tts;
    })();
    pool.set(voice, p); // posé synchroniquement → pas de double création en concurrence
    // échec d'ouverture : retirer du cache (sinon la voix reste morte) ET marquer la
    // promesse comme gérée, sinon Node la voit comme rejection non traitée.
    p.catch(() => {
      if (pool.get(voice) === p) pool.delete(voice);
    });
  }
  return p;
}

function evict(voice: string): void {
  const p = pool.get(voice);
  pool.delete(voice);
  p?.then((t) => t.close()).catch(() => {}); // ferme la vieille socket morte, best-effort
}

// Fabrique l'audio d'une phrase avec l'instance en cache ; timeout 8 s.
async function synthesizeOnce(voice: string, text: string): Promise<Buffer> {
  const tts = await getTts(voice);
  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];
  const collect = new Promise<void>((resolve, reject) => {
    audioStream.on("data", (c: Buffer) => chunks.push(c));
    audioStream.on("end", () => resolve());
    audioStream.on("error", reject);
  });
  collect.catch(() => {}); // si le timeout gagne la course, l'échec tardif reste géré
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 8000)
  );
  await Promise.race([collect, timeout]);
  return Buffer.concat(chunks);
}

// Un audio vide = socket expirée : on évince et on retente une fois avec une instance fraîche.
async function synthesize(voice: string, text: string): Promise<Buffer> {
  let audio = await synthesizeOnce(voice, text);
  if (audio.length === 0) {
    evict(voice);
    audio = await synthesizeOnce(voice, text);
  }
  return audio;
}

export async function POST(req: Request): Promise<Response> {
  let body: { text?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Requête invalide.", { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const voice = body.voice ?? "";
  if (!text || text.length > 800) return new Response("Texte invalide.", { status: 400 });
  if (!EDGE_VOICE_ALLOWLIST.includes(voice)) return new Response("Voix inconnue.", { status: 400 });

  try {
    const audio = await synthesize(voice, text);
    if (audio.length === 0) return new Response("Synthèse vide.", { status: 502 });
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    evict(voice); // en cas d'erreur, ne pas garder une instance douteuse en cache
    return new Response("Synthèse indisponible.", { status: 502 });
  }
}
