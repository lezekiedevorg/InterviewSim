export function isRateLimitError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const msg = String((err as { message?: string })?.message ?? err);
  return status === 429 || /429|RESOURCE_EXHAUSTED/i.test(msg);
}
