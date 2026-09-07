export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string, now?: Date): RateLimitDecision;
}

interface Bucket {
  count: number;
  resetAtMs: number;
}

export class InMemoryFixedWindowRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {
    if (limit <= 0 || windowMs <= 0) {
      throw new Error('INVALID_RATE_LIMIT_CONFIGURATION');
    }
  }

  consume(key: string, now: Date = new Date()): RateLimitDecision {
    const nowMs = now.getTime();
    const existing = this.buckets.get(key);
    const bucket = !existing || existing.resetAtMs <= nowMs
      ? { count: 0, resetAtMs: nowMs + this.windowMs }
      : existing;

    bucket.count += 1;
    this.buckets.set(key, bucket);

    return {
      allowed: bucket.count <= this.limit,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAtMs - nowMs) / 1000)),
    };
  }
}
