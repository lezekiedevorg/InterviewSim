/**
 * Healthcheck — volontairement sans aucune dépendance.
 *
 * Il ne touche ni Supabase, ni Groq, ni le système de fichiers. Un healthcheck
 * qui interroge la base passe au rouge dès qu'une panne externe survient, et
 * l'orchestrateur tue un conteneur pourtant en pleine santé. Si un jour on
 * veut un contrôle strict des dépendances, il ira dans /api/readiness, pas ici.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    ts: new Date().toISOString(),
  });
}
