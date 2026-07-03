import { buildCrossAnalysisPrompt } from "@/lib/prompts";
import { askModelText } from "@/lib/askModel";
import { parseCrossAnalysis } from "@/lib/parseCrossAnalysis";
import { isRateLimitError } from "@/lib/mapModelError";
import type { SessionSummary } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { sessions: SessionSummary[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const sessions = Array.isArray(body.sessions) ? body.sessions : [];
  if (sessions.length < 3) {
    return Response.json(
      { error: "Au moins 3 entretiens sont nécessaires." },
      { status: 400 }
    );
  }

  const prompt = buildCrossAnalysisPrompt(sessions.slice(0, 10));

  // ponytail: Groq exige >=1 message user ; seed serveur, jamais montré à l'UI (comme le débrief).
  const seed = [
    { role: "candidate" as const, text: "Génère l'analyse de mes points faibles récurrents." },
  ];

  try {
    // Premier essai
    let raw = await askModelText(prompt, seed);
    let analysis = parseCrossAnalysis(raw);

    // Un seul re-essai si le JSON est malformé
    if (!analysis) {
      raw = await askModelText(prompt, seed);
      analysis = parseCrossAnalysis(raw);
    }

    if (analysis) return Response.json({ analysis });
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
