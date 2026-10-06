import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";

import {
  hashSessionToken,
  hashGuestSessionToken,
  SESSION_COOKIE_NAME,
  GUEST_SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  GUEST_EDIT_TTL_MS,
  GUEST_CLAIM_GRACE_MS,
  GUEST_SESSION_TTL_MS,
  GUEST_SESSION_TTL_SECONDS,
  IDLE_TIMEOUT_MS,
  SESSION_LAST_USED_UPDATE_THRESHOLD,
} from "@synctext/shared";

describe("@synctext/shared token hashing", () => {
  it("produces 64-char SHA-256 hex digests, never the raw token", () => {
    const token = randomBytes(32).toString("base64url");
    const h = hashSessionToken(token);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });

  it("guest and session hashes share the same one-way format", () => {
    const token = "some-token";
    expect(hashGuestSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashGuestSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("different tokens hash differently", () => {
    expect(hashSessionToken("a")).not.toBe(hashSessionToken("b"));
  });
});

describe("@synctext/shared constants", () => {
  it("cookie names are stable across synctext and collab", () => {
    expect(SESSION_COOKIE_NAME).toBe("session");
    expect(GUEST_SESSION_COOKIE_NAME).toBe("guest_session");
  });

  it("session lifetime is 7 days in seconds (cookie + DB share it)", () => {
    expect(SESSION_TTL_SECONDS).toBe(7 * 24 * 60 * 60);
  });

  it("session idle timeout is 2 hours", () => {
    expect(IDLE_TIMEOUT_MS).toBe(2 * 60 * 60 * 1000);
  });

  it("lastUsed refresh threshold is 30 minutes", () => {
    expect(SESSION_LAST_USED_UPDATE_THRESHOLD).toBe(30 * 60 * 1000);
  });

  it("guest session = edit window + claim grace", () => {
    expect(GUEST_EDIT_TTL_MS).toBe(30 * 60 * 1000);
    expect(GUEST_CLAIM_GRACE_MS).toBe(5 * 60 * 1000);
    expect(GUEST_SESSION_TTL_MS).toBe(GUEST_EDIT_TTL_MS + GUEST_CLAIM_GRACE_MS);
    expect(GUEST_SESSION_TTL_SECONDS).toBe(GUEST_SESSION_TTL_MS / 1000);
  });
});
