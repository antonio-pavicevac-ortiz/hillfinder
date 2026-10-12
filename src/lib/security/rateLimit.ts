// In-memory sliding-window rate limiter.
// Counts are per server process, so on serverless or multi-instance hosting each
// instance keeps its own window. Swap for a shared store (e.g. Redis) when scaling out.

type Bucket = number[];

declare global {
  var rateLimitBuckets: Map<string, Bucket> | undefined;
}

const buckets: Map<string, Bucket> = (globalThis.rateLimitBuckets ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);
  return true;
}

export function clientIp(headers: Headers | Record<string, unknown> | undefined): string {
  const raw =
    headers instanceof Headers
      ? headers.get("x-forwarded-for")
      : (headers?.["x-forwarded-for"] as string | undefined);

  return raw?.split(",")[0]?.trim() || "unknown";
}
