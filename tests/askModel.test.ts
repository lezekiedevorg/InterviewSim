import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { askModelText, askModelStream } from "../lib/askModel";

// Fabrique un flux SSE minimal : un chunk de contenu puis [DONE].
function sseBody(): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n'));
      c.enqueue(enc.encode("data: [DONE]\n"));
      c.close();
    },
  });
}

function stubFetch(res: Partial<Response>) {
  const fn = vi.fn().mockResolvedValue({ ok: true, ...res });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  process.env.GROQ_API_KEY = "clef-de-test";
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("askModel — modèle et effort de réflexion", () => {
  it("askModelText envoie gpt-oss-120b, reasoning_effort medium, stream false", async () => {
    const fn = stubFetch({ json: async () => ({ choices: [{ message: { content: "ok" } }] }) });
    await askModelText("sys", []);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.reasoning_effort).toBe("medium");
    expect(body.stream).toBe(false);
  });

  it("askModelText transmet toujours la température quand demandée", async () => {
    const fn = stubFetch({ json: async () => ({ choices: [{ message: { content: "ok" } }] }) });
    await askModelText("sys", [], { temperature: 0 });
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.temperature).toBe(0);
    expect(body.reasoning_effort).toBe("medium");
  });

  it("askModelStream envoie reasoning_effort low et stream true", async () => {
    const fn = stubFetch({ body: sseBody() });
    const out: string[] = [];
    for await (const t of askModelStream("sys", [])) out.push(t);
    expect(out.join("")).toBe("ok");
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.reasoning_effort).toBe("low");
    expect(body.stream).toBe(true);
  });
});
