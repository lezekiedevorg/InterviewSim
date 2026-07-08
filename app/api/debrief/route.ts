import { validateContext } from "@/lib/validate";
import { buildDebriefPrompt } from "@/lib/prompts";
import { askModelText } from "@/lib/askModel";
import { parseDebrief } from "@/lib/parseDebrief";
import { isRateLimitError } from "@/lib/mapModelError";
import { estTropCourt } from "@/lib/score";
import type { InterviewContext, ChatMessage } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { context: InterviewContext; transcript: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const errors = validateContext(body.context ?? {});
  if (errors.length > 0) {
    return Response.json({ error: errors.join(" ") }, { status: 400 });
  }

  const transcript = body.transcript ?? [];

  // Entretien trop court pour être noté sérieusement : on ne consomme pas le modèle.
  if (estTropCourt(transcript)) {
    return Response.json({ tooShort: true });
  }

  const prompt = buildDebriefPrompt(body.context, transcript);

  // ponytail: Gemini rejects contents:[]; seed provides required user content; server-only, not shown to UI
  const seed = [{ role: "candidate" as const, text: "Génère le débrief de cet entretien." }];

  try {
    // Premier essai
    let raw = await askModelText(prompt, seed, { temperature: 0 });
    let debrief = parseDebrief(raw);

    // Un seul re-essai si le JSON est malformé
    if (!debrief) {
      // Re-essai à température légèrement relevée : à 0 le modèle est déterministe,
      // il reproduirait le même JSON cassé.
      raw = await askModelText(prompt, seed, { temperature: 0.2 });
      debrief = parseDebrief(raw);
    }

    if (debrief) return Response.json({ debrief });
    return Response.json({ raw }); // fallback texte brut
  } catch (err: unknown) {
    if (isRateLimitError(err)) {
      return Response.json(
        { error: "L'IA est momentanément surchargée, réessaie dans quelques instants." },
        { status: 429 }
      );
    }
    return Response.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
