import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSilenceDetector } from "../lib/silenceDetector";

describe("createSilenceDetector", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("déclenche onFire après delayMs sans bump, avec le dernier texte", () => {
    const fire = vi.fn();
    const d = createSilenceDetector(2500, fire);
    d.bump("bonjour");
    vi.advanceTimersByTime(2499);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledWith("bonjour");
  });

  it("un bump avant l'échéance réarme le minuteur (pas de tir prématuré)", () => {
    const fire = vi.fn();
    const d = createSilenceDetector(2500, fire);
    d.bump("bon");
    vi.advanceTimersByTime(2000);
    d.bump("bonjour");
    vi.advanceTimersByTime(2000);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fire).toHaveBeenCalledWith("bonjour");
  });

  it("ne tire pas si le dernier texte est vide/espaces", () => {
    const fire = vi.fn();
    const d = createSilenceDetector(2500, fire);
    d.bump("   ");
    vi.advanceTimersByTime(2500);
    expect(fire).not.toHaveBeenCalled();
  });

  it("cancel() empêche le tir", () => {
    const fire = vi.fn();
    const d = createSilenceDetector(2500, fire);
    d.bump("bonjour");
    vi.advanceTimersByTime(1000);
    d.cancel();
    vi.advanceTimersByTime(5000);
    expect(fire).not.toHaveBeenCalled();
  });
});
