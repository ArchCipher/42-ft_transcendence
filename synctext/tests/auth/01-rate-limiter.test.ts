import { describe, it, expect } from "vitest";
import {
  accountKey,
  accountLimiter,
  EMAIL_LIMIT,
  emailKey,
  emailLimiter,
  MemoryRateLimiter,
} from "../../lib/auth/rate-limit";

const KEY = "ip:1.2.3.4";

function makeLimiter(maxFailures = 10) {
  return new MemoryRateLimiter({
    windowMs: 60 * 60 * 1000, // 1h
    maxFailures,
    lockoutMs: 60 * 60 * 1000, // 1h
  });
}

describe("MemoryRateLimiter.blockedRemaining", () => {
  it("returns 0 for an unknown key", async () => {
    expect(await makeLimiter().blockedRemaining(KEY)).toBe(0);
  });

  it("returns >0 only while locked", async () => {
    const limiter = makeLimiter(3);
    await limiter.recordFailure(KEY, 0);
    await limiter.recordFailure(KEY, 100);
    await limiter.recordFailure(KEY, 200); // 3rd failure -> lockout
    expect(await limiter.blockedRemaining(KEY, 300)).toBeGreaterThan(0);

    // lockout expires before windowMs would; sweep drops keys once the
    // lockout is over (lockoutMs=10 here vs 1h window).
    const shortLockout = new MemoryRateLimiter({
      windowMs: 60 * 60 * 1000,
      maxFailures: 3,
      lockoutMs: 10,
    });
    await shortLockout.recordFailure(KEY, 0);
    await shortLockout.recordFailure(KEY, 1);
    await shortLockout.recordFailure(KEY, 2);
    expect(await shortLockout.blockedRemaining(KEY, 3)).toBeGreaterThan(0);
    expect(await shortLockout.blockedRemaining(KEY, 50)).toBe(0);
  });
});

describe("MemoryRateLimiter.recordFailure", () => {
  it("locks out after maxFailures attempts", async () => {
    const limiter = makeLimiter(3);
    const results = [];
    for (let t = 0; t < 6; t++) {
      results.push(await limiter.recordFailure(KEY, t * 10));
    }
    // 3rd attempt (index 2) crosses the threshold and returns true.
    expect(results).toEqual([false, false, true, false, false, false]);
    expect(await limiter.blockedRemaining(KEY, 100)).toBeGreaterThan(0);
  });
});

describe("MemoryRateLimiter.tryAcquire (atomic reserve)", () => {
  it("allows exactly maxFailures reservations, then rejects", async () => {
    const limiter = makeLimiter(3);
    expect(await limiter.tryAcquire(KEY, 0)).toBe(true);
    expect(await limiter.tryAcquire(KEY, 10)).toBe(true);
    expect(await limiter.tryAcquire(KEY, 20)).toBe(true);
    // 4th reservation at/beyond the budget must be rejected.
    expect(await limiter.tryAcquire(KEY, 30)).toBe(false);
    expect(await limiter.tryAcquire(KEY, 40)).toBe(false);
  });

  it("off-by-one regression: maxFailures allowed, and NOT maxFailures+1", async () => {
    const limiter = makeLimiter(10);
    let allowed = 0;
    for (let t = 0; t < 12; t++) {
      if (await limiter.tryAcquire(KEY, t)) allowed++;
    }
    expect(allowed).toBe(10);
  });

  it("sliding window: reservations older than windowMs stop counting", async () => {
    // Deliberately a 1000ms window (makeLimiter uses 1h) so the times below
    // cross the aging boundary.
    const limiter = new MemoryRateLimiter({
      windowMs: 1000,
      maxFailures: 3,
      lockoutMs: 1000,
    });
    await limiter.tryAcquire(KEY, 0);
    await limiter.tryAcquire(KEY, 100);
    await limiter.tryAcquire(KEY, 200);
    expect(await limiter.tryAcquire(KEY, 300)).toBe(false); // 3 in window

    // At t=1200 every entry is >= windowMs old (ages 1200/1100/1000), so the
    // filter (`now - t < windowMs`) drops all three and a slot frees up.
    expect(await limiter.tryAcquire(KEY, 1200)).toBe(true);
  });

  it("does not grant any more slots once lockout is active", async () => {
    const limiter = makeLimiter(3);
    await limiter.recordFailure(KEY, 0);
    await limiter.recordFailure(KEY, 1);
    await limiter.recordFailure(KEY, 2); // triggers lockout (lockoutMs=1h)
    expect(await limiter.tryAcquire(KEY, 10)).toBe(false);
  });

  it("concurrency: 100 racing callers get AT MOST maxFailures grants", async () => {
    const limiter = makeLimiter(10);
    const results = await Promise.all(
      Array.from({ length: 100 }, () => limiter.tryAcquire(KEY)),
    );
    expect(results.filter(Boolean)).toHaveLength(10);
  });
});

describe("An email budget cannot lock an account out of login", () => {
  it("grants exactly EMAIL_LIMIT.maxFailures sends, then refuses leaving accountLimiter untouched", async () => {
    const email = "victim-limit@test.local";
    const grants: boolean[] = [];
    for (let i = 0; i < EMAIL_LIMIT.maxFailures + 1; i++)
      grants.push(await emailLimiter.tryAcquire(emailKey(email)));
    expect(grants.filter(Boolean)).toHaveLength(EMAIL_LIMIT.maxFailures);
	expect(await emailLimiter.tryAcquire(emailKey(email), Date.now() + EMAIL_LIMIT.windowMs + 1)).toBe(true);
    expect(await accountLimiter.blockedRemaining(accountKey(email))).toBe(0);
  });
});
