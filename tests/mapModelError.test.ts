import { describe, it, expect } from "vitest";
import { isRateLimitError } from "../lib/mapModelError";

describe("isRateLimitError", () => {
  it("true when status is 429", () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
  });
  it("true when message contains RESOURCE_EXHAUSTED", () => {
    expect(isRateLimitError(new Error("gRPC RESOURCE_EXHAUSTED quota"))).toBe(true);
  });
  it("true when message contains 429", () => {
    expect(isRateLimitError(new Error("HTTP 429 Too Many Requests"))).toBe(true);
  });
  it("false for a generic error", () => {
    expect(isRateLimitError(new Error("network down"))).toBe(false);
  });
});
