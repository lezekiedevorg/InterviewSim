import { validateContext } from "@/lib/validate";
import { buildRecruiterPrompt, buildJuryPrompt, buildDrillPrompt } from "@/lib/prompts";
import { askModelStream } from "@/lib/askModel";
import { isRateLimitError } from "@/lib/mapModelError";
import type { InterviewContext, ChatMessage } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { context: InterviewContext; history: ChatMessage[]; jury?: boolean; theme?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Requête invalide.", { status: 400 });
  }

  const errors = validateContext(body.context ?? {});
  if (errors.length > 0) {
    return new Response(errors.join(" "), { status: 400 });
  }

  const DRILL_QUESTIONS = 4; // ponytail: cap fixe ; passer en param si on veut 3-5 variable
  const systemPrompt = body.theme
    ? buildDrillPrompt(body.context, body.theme, DRILL_QUESTIONS)
    : body.jury
    ? buildJuryPrompt(body.context)
    : buildRecruiterPrompt(body.context);
  const history = body.history ?? [];
  // ponytail: Gemini rejects contents:[]; seed a candidate turn server-only so the UI history is untouched
  const modelHistory = history.length > 0
    ? history
    : [{ role: "candidate" as const, text: "Bonjour, je suis prêt à commencer l'entretien." }];

  try {
    const iterator = askModelStream(systemPrompt, modelHistory)[Symbol.asyncIterator]();
    const first = await iterator.next(); // a pre-output 429 throws HERE, before headers are sent

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!first.done && first.value) {
            controller.enqueue(encoder.encode(first.value));
          }
          let r = await iterator.next();
          while (!r.done) {
            if (r.value) controller.enqueue(encoder.encode(r.value));
            r = await iterator.next();
          }
          controller.close();
        } catch (err) {
          // ponytail: 200 already sent here; can't remap to 429 mid-stream. Abort so the client sees a hard error.
          controller.error(err);
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    return mapError(err); // now reachable for errors thrown before the first chunk (429, etc.)
  }
}

function mapError(err: unknown): Response {
  if (isRateLimitError(err)) {
    return new Response(
      "L'IA est momentanément surchargée, réessaie dans quelques instants.",
      { status: 429 }
    );
  }
  return new Response("Une erreur est survenue.", { status: 500 });
}
