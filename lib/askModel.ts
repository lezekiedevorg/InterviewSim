import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "./types";

const MODEL = "gemini-2.5-flash";

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");
  return new GoogleGenAI({ apiKey });
}

function toContents(history: ChatMessage[]) {
  return history.map((m) => ({
    role: m.role === "candidate" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
}

export async function* askModelStream(
  systemPrompt: string,
  history: ChatMessage[]
): AsyncIterable<string> {
  const ai = client();
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: toContents(history),
    config: { systemInstruction: systemPrompt },
  });
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}

export async function askModelText(
  systemPrompt: string,
  history: ChatMessage[]
): Promise<string> {
  const ai = client();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: toContents(history),
    config: { systemInstruction: systemPrompt },
  });
  return res.text ?? "";
}
