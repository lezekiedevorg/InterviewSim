import { describe, it, expect } from "vitest";
import { isTtsSocketNoise } from "../lib/ttsNoise";

describe("isTtsSocketNoise", () => {
  it("reconnaît les erreurs de socket Edge TTS vues en vrai", () => {
    const vues = [
      new Error("Edge TTS WebSocket error: WebSocket was closed before the connection was established"),
      new TypeError("Cannot read properties of undefined (reading 'audio')"),
      new Error("aborted"),
    ];
    for (const e of vues) expect(isTtsSocketNoise(e)).toBe(true);
  });

  it("regarde aussi la cause", () => {
    const e = new Error("échec de synthèse", {
      cause: new Error("WebSocket was closed before the connection was established"),
    });
    expect(isTtsSocketNoise(e)).toBe(true);
  });

  it("laisse passer les vraies erreurs", () => {
    expect(isTtsSocketNoise(new Error("timeout"))).toBe(false);
    expect(isTtsSocketNoise(new TypeError("x is not a function"))).toBe(false);
    expect(isTtsSocketNoise(new RangeError("Maximum call stack size exceeded"))).toBe(false);
    expect(isTtsSocketNoise("boom")).toBe(false);
  });
});
