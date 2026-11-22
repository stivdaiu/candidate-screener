// Simple in-memory rate limiter: at most N screenings per visitor per hour.
// Protects the public demo from abuse (API costs, Slack spam).
// Note: memory is per server instance, so on Vercel this is "best effort".
// For a production system, use a shared store such as Redis (e.g. Upstash).

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const hits = new Map<string, number[]>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

// The visitor's IP address, as forwarded by Vercel.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(
  key: string,
  limit = Number(process.env.RATE_LIMIT_PER_HOUR ?? 0), // 0 or unset = no limit (local development)
  now = Date.now(),
): RateLimitResult {
  if (!Number.isFinite(limit) || limit <= 0)
    return { allowed: true, retryAfterSeconds: 0 };

  // Keep only the requests from the last hour
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfterSeconds = Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(key, recent);

  // Stop the map from growing forever
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
