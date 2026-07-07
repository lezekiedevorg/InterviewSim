export const runtime = "nodejs";

// Ping de réveil du Space (privé => seul le serveur peut le joindre).
// Fire-and-forget : la réponse du Space n'a aucune importance, on répond toujours 204.
export async function GET(): Promise<Response> {
  const url = process.env.POCKET_TTS_URL;
  const token = process.env.POCKET_TTS_TOKEN;
  if (url && token) {
    try {
      await fetch(`${url}/health`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Space en cours de réveil ou injoignable : c'était justement le but du ping.
    }
  }
  return new Response(null, { status: 204 });
}
