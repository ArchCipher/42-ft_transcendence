/*
In-memory rate limiter + lockout for the auth endpoints.

NOTE: in-memory state is per-process and lost on restart. If persistence
is required, we should consider Redis to store in-memory cache state.
*/

export interface RateLimitConfig {
  // observation window: failures older than this are forgotten (ms)
  windowMs: number;
  // failures within windowMs that triggers a lockout
  maxFailures: number;
  // how long the key stays blocked once the threshold is hit (ms)
  lockoutMs: number;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/*
Per-IP: modest budget. A single IP hammering the login endpoint hits this
quickly. Applies to login AND register.
*/
export const IP_LIMIT: RateLimitConfig = {
  windowMs: FIFTEEN_MINUTES,
  maxFailures: 10,
  lockoutMs: FIFTEEN_MINUTES,
};

/*
Per-account: higher budget than per-IP so a distributed attack (many IPs,
one target account) needs a LOT more attempts before the account is locked,
which keeps the lockout from being a trivial DoS vector.
*/
export const ACCOUNT_LIMIT: RateLimitConfig = {
  windowMs: FIFTEEN_MINUTES,
  maxFailures: 20,
  lockoutMs: FIFTEEN_MINUTES,
};

/*
Sign-up quota: how many accounts can be created in one hour
NOTE: successes counted, not failures like lockouts above
*/
export const REGISTER_LIMIT: RateLimitConfig = {
  windowMs: ONE_HOUR,
  maxFailures: 5,
  lockoutMs: ONE_HOUR,
};

/*
Guest document creation quota. These requests allocate database rows without
an authenticated identity, so they need their own small per-network budget.
Unlike registration, a slot is reserved before the DB write (tryAcquire), so
attempts - success or rare DB failure count against budget, which also prevents
hammering a failing endpoint.
*/
export const GUEST_DOCUMENT_LIMIT: RateLimitConfig = {
  windowMs: ONE_HOUR,
  maxFailures: 10,
  lockoutMs: ONE_HOUR,
};

/*
Outbound mail per address. Deliberately not ACCOUNT_LIMIT: login and register check
accountLimiter, so sharing one bucket lets a stranger asking for reset emails lock
the account owner out of login.
*/
export const EMAIL_LIMIT: RateLimitConfig = {
  windowMs: FIFTEEN_MINUTES,
  maxFailures: 5,
  lockoutMs: FIFTEEN_MINUTES,
};

interface Bucket {
  failures: number[]; // timestamps of failed attempts in current window
  lockedUntil: number; // ms the key is blocked (0 = allowed)
}

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly config: RateLimitConfig) {}

  // ms the key is still blocked (0 = allowed)
  async blockedRemaining(
    key: string,
    now: number = Date.now(),
  ): Promise<number> {
    const bucket = this.buckets.get(key);
    if (!bucket) return 0;
    if (bucket.lockedUntil <= now) {
      // only drop state if actually locked
      if (bucket.lockedUntil > 0) this.buckets.delete(key); // lockout expired
      return 0;
    }
    return bucket.lockedUntil - now;
  }

  /*
  Record one failed attempt for the key (sliding window).
  Returns true if THIS failure crossed the threshold and triggered a lockout,
  so the route can log it. No-op while already locked.
  */
  async recordFailure(key: string, now: number = Date.now()): Promise<boolean> {
    this.sweep(now);

    const bucket = this.buckets.get(key) ?? { failures: [], lockedUntil: 0 };

    if (bucket.lockedUntil > now) return false; // already locked: fixed duration

    // sliding window: drop attempts older than the observation window (create
    // new array where `now - t < this.config.windowMs` is true)
    bucket.failures = bucket.failures.filter(
      (t) => now - t < this.config.windowMs,
    );
    bucket.failures.push(now);

    if (bucket.failures.length < this.config.maxFailures) {
      this.buckets.set(key, bucket);
      return false;
    }
    bucket.lockedUntil = now + this.config.lockoutMs;
    bucket.failures = []; // window reset once locked
    this.buckets.set(key, bucket);
    return true;
  }

  // atomic check and count: reserves a slot synchronously (no internal await),
  // so concurrent callers cannot both pass over budget check
  async tryAcquire(key: string, now: number = Date.now()): Promise<boolean> {
    this.sweep(now);
    const bucket = this.buckets.get(key) ?? { failures: [], lockedUntil: 0 };
    if (bucket.lockedUntil > now) return false;
    bucket.failures = bucket.failures.filter(
      (t) => now - t < this.config.windowMs,
    );
    if (bucket.failures.length >= this.config.maxFailures) return false;
    bucket.failures.push(now);
    this.buckets.set(key, bucket);
    return true;
  }

  /*
  Forget a key entirely. Triggered on SUCCESSFUL authentication and on a
  successful password reset.
  */
  async clear(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  // memory rate-limit
  private sweep(now: number) {
    if (this.buckets.size < 10000) return;
    for (const [k, v] of this.buckets)
      if (
        v.lockedUntil <= now &&
        (v.failures.length === 0 ||
          now - v.failures[v.failures.length - 1]! >= this.config.windowMs)
      )
        this.buckets.delete(k);
  }

  // For tests: number of keys currently tracked.
  size(): number {
    return this.buckets.size;
  }
}

// Singleton instances shared by all auth routes (same process -> shared state)
export const ipLimiter = new MemoryRateLimiter(IP_LIMIT);
export const accountLimiter = new MemoryRateLimiter(ACCOUNT_LIMIT);
export const registerLimiter = new MemoryRateLimiter(REGISTER_LIMIT);
export const guestDocumentLimiter = new MemoryRateLimiter(GUEST_DOCUMENT_LIMIT);
export const emailLimiter = new MemoryRateLimiter(EMAIL_LIMIT);

/*
Keys must be namespaced: IPs and accounts share the limiter instance space
so that `ipKey(8.8.8.8)` doesn't collide with `accountKey(8.8.8.8)`.
*/
export const ipKey = (ip: string): string => `ip:${ip}`;
export const accountKey = (email: string): string => `account:${email}`;
export const emailKey = (email: string): string => `email:${email}`;

/*
Best-effort client IP for the IP limiter. Behind a trusted reverse proxy
(nginx) the proxy MUST overwrite x-forwarded-for/x-real-ip. If it merely
appends, the header is attacker-spoofable and per-IP limiting is trivially
bypassed.

NOTE: If a WAF module is implemented, it must also be configured to overwrite
these headers from the trusted connection.
*/
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
