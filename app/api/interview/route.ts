import { validateContext } from "@/lib/validate";
import { buildRecruiterPrompt } from "@/lib/prompts";
import { askModelStream } from "@/lib/askModel";
import type { InterviewContext, ChatMessage } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { context: InterviewContext; history: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Requête invalide.", { status: 400 });
  }

  const errors = validateContext(body.context ?? {});
  if (errors.length > 0) {
    return new Response(errors.join(" "), { status: 400 });
  }

  const systemPrompt = buildRecruiterPrompt(body.context);
  const history = body.history ?? [];

  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of askModelStream(systemPrompt, history)) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    return mapError(err);
  }
}

function mapError(err: unknown): Response {
  const msg = String((err as { message?: string })?.message ?? err);
  const status = (err as { status?: number })?.status;
  if (status === 429 || /429|RESOURCE_EXHAUSTED/i.test(msg)) {
    return new Response(
      "L'IA est momentanément surchargée, réessaie dans quelques instants.",
      { status: 429 }
    );
  }
  return new Response("Une erreur est survenue.", { status: 500 });
}
