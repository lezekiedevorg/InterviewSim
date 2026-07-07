import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { EDGE_VOICE_ALLOWLIST, EDGE_SOLO_VOICE } from "@/lib/edgeVoices";
import { isPocketVoice, pocketVoiceId, POCKET_VOICE_IDS } from "@/lib/pocketVoices";

export const runtime = "nodejs";

// Chemin edge historique, inchangé — sert aussi de repli aux voix pocket.
async function edgeMp3(voice: string, text: string): Promise<Buffer | null> {
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    const collect = new Promise<void>((resolve, reject) => {
      audioStream.on("data", (c: Buffer) => chunks.push(c));
      audioStream.on("end", () => resolve());
      audioStream.on("error", reject);
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8000)
    );
    await Promise.race([collect, timeout]);

    const audio = Buffer.concat(chunks);
    return audio.length === 0 ? null : audio;
  } catch {
    return null;
  }
}

// Voix pocket : Space HF privé. null (panne, timeout, env absente) => le caller replie sur edge.
async function pocketMp3(voiceId: string, text: string): Promise<Buffer | null> {
  const url = process.env.POCKET_TTS_URL;
  const token = process.env.POCKET_TTS_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, voice: voiceId }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const audio = Buffer.from(await res.arrayBuffer());
    return audio.length === 0 ? null : audio;
  } catch {
    return null;
  }
}

function mp3Response(audio: Buffer): Response {
  return new Response(new Uint8Array(audio), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
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

  if (isPocketVoice(voice)) {
    const id = pocketVoiceId(voice);
    if (!POCKET_VOICE_IDS.includes(id)) return new Response("Voix inconnue.", { status: 400 });
    // Space endormi/en panne -> repli edge silencieux : l'utilisateur entend toujours quelque chose.
    const audio = (await pocketMp3(id, text)) ?? (await edgeMp3(EDGE_SOLO_VOICE, text));
    return audio ? mp3Response(audio) : new Response("Synthèse indisponible.", { status: 502 });
  }

  if (!EDGE_VOICE_ALLOWLIST.includes(voice)) return new Response("Voix inconnue.", { status: 400 });
  const audio = await edgeMp3(voice, text);
  return audio ? mp3Response(audio) : new Response("Synthèse indisponible.", { status: 502 });
}
