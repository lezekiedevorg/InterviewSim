import type { ChatMessage } from "./types";

// Groq : tier gratuit à quota PAR CLÉ (pas un pool partagé comme OpenRouter :free),
// donc pas de 429 dès qu'un autre utilisateur sature. OpenAI-compatible.
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

function apiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY manquante");
  return key;
}

function toMessages(systemPrompt: string, history: ChatMessage[]) {
  return [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "candidate" ? "user" : "assistant",
      content: m.text,
    })),
  ];
}

async function post(
  systemPrompt: string,
  history: ChatMessage[],
  stream: boolean,
  temperature?: number
) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: toMessages(systemPrompt, history),
      stream,
      // gpt-oss : réfléchit peu quand il parle en direct (latence voix), davantage quand il corrige.
      // Envoyé seulement pour gpt-oss : un repli vers llama rejetterait ce paramètre.
      ...(MODEL.startsWith("openai/gpt-oss") && {
        reasoning_effort: stream ? "low" : "medium",
      }),
      // Température imposée uniquement quand demandé (débrief : 0 → correcteur froid et régulier)
      ...(temperature !== undefined && { temperature }),
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq ${res.status}: ${await res.text()}`);
  }
  return res;
}

export async function* askModelStream(
  systemPrompt: string,
  history: ChatMessage[]
): AsyncIterable<string> {
  const res = await post(systemPrompt, history, true);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // garde la ligne partielle pour le prochain chunk
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      const text = JSON.parse(data).choices?.[0]?.delta?.content;
      if (text) yield text;
    }
  }
}

export async function askModelText(
  systemPrompt: string,
  history: ChatMessage[],
  opts?: { temperature?: number }
): Promise<string> {
  const res = await post(systemPrompt, history, false, opts?.temperature);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}
