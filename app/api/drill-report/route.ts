import { buildDrillReportPrompt } from "@/lib/prompts";
import { askModelText } from "@/lib/askModel";
import { parseDrillReport } from "@/lib/parseDrillReport";
import { isRateLimitError } from "@/lib/mapModelError";
import { drillTheme } from "@/lib/drillThemes";
import type { ChatMessage } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { theme: string; transcript: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!drillTheme(body.theme)) {
    return Response.json({ error: "Thème inconnu." }, { status: 400 });
  }
  const transcript = body.transcript ?? [];
  const prompt = buildDrillReportPrompt(body.theme, transcript);
  const seed = [{ role: "candidate" as const, text: "Génère le bilan de cette session." }];

  try {
    let raw = await askModelText(prompt, seed, { temperature: 0 });
    let report = parseDrillReport(raw);
    if (!report) {
      raw = await askModelText(prompt, seed, { temperature: 0.2 });
      report = parseDrillReport(raw);
    }
    if (report) return Response.json({ report });
    return Response.json({ raw });
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
