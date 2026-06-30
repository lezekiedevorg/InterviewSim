import { validateContext } from "@/lib/validate";
import { buildDebriefPrompt } from "@/lib/prompts";
import { askModelText } from "@/lib/askModel";
import { parseDebrief } from "@/lib/parseDebrief";
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

  const prompt = buildDebriefPrompt(body.context, body.transcript ?? []);

  try {
    // Premier essai
    let raw = await askModelText(prompt, []);
    let debrief = parseDebrief(raw);

    // Un seul re-essai si le JSON est malformé
    if (!debrief) {
      raw = await askModelText(prompt, []);
      debrief = parseDebrief(raw);
    }

    if (debrief) return Response.json({ debrief });
    return Response.json({ raw }); // fallback texte brut
  } catch (err: unknown) {
    const msg = String((err as { message?: string })?.message ?? err);
    const status = (err as { status?: number })?.status;
    if (status === 429 || /429|RESOURCE_EXHAUSTED/i.test(msg)) {
      return Response.json(
        { error: "L'IA est momentanément surchargée, réessaie dans quelques instants." },
        { status: 429 }
      );
    }
    return Response.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
