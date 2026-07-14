import "server-only";

import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitOptions = { limit: number; windowSeconds: number };
type MemoryBucket = { count: number; reset: number };

const memoryBuckets = new Map<string, MemoryBucket>();
const distributedLimiters = new Map<string, Ratelimit>();

function identifier(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const raw = forwarded || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "local";
  return `${scope}:${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
}

function distributedLimiter(scope: string, options: LimitOptions) {
  const key = `${scope}:${options.limit}:${options.windowSeconds}`;
  let limiter = distributedLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(options.limit, `${options.windowSeconds} s` as `${number} s`), prefix: `cardwise:events:${scope}`, analytics: true });
    distributedLimiters.set(key, limiter);
  }
  return limiter;
}

export async function enforceRateLimit(request: Request, scope: string, options: LimitOptions) {
  const id = identifier(request, scope);
  let success: boolean;
  let remaining: number;
  let reset: number;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const result = await distributedLimiter(scope, options).limit(id);
    ({ success, remaining, reset } = result);
  } else {
    const now = Date.now();
    const existing = memoryBuckets.get(id);
    const bucket = !existing || existing.reset <= now ? { count: 0, reset: now + options.windowSeconds * 1000 } : existing;
    bucket.count += 1;
    memoryBuckets.set(id, bucket);
    success = bucket.count <= options.limit;
    remaining = Math.max(0, options.limit - bucket.count);
    reset = bucket.reset;
    if (memoryBuckets.size > 5000) for (const [key, value] of memoryBuckets) if (value.reset <= now) memoryBuckets.delete(key);
  }
  if (success) return null;
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(options.limit), "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Reset": String(reset) } });
}
