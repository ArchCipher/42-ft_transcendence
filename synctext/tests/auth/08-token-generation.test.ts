import { describe, it, expect, afterEach, vi } from "vitest";
import { createHash, randomBytes } from "node:crypto";

import {
  generateVerificationToken,
  hashVerificationToken,
  verificationExpiresAt,
  verificationUrl,
  VERIFICATION_TTL_SECONDS,
} from "../../lib/auth/verification";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
  passwordResetUrl,
  PASSWORD_RESET_TTL_SECONDS,
} from "../../lib/auth/password-reset";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("email verification tokens", () => {
  it("generates 43-char base64url tokens (256 bits) that differ per call", () => {
    const a = generateVerificationToken();
    const b = generateVerificationToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("stores only a SHA-256 hex digest, never the raw token", () => {
    const token = "abc";
    const hash = hashVerificationToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // deterministic + one-way: recomputable but not raw
    expect(hash).toBe(
      createHash("sha256").update("abc").digest("hex"),
    );
    expect(hashVerificationToken("abc")).toBe(hashVerificationToken("abc"));
  });

  it("expires after VERIFICATION_TTL_SECONDS (1 day)", () => {
    expect(VERIFICATION_TTL_SECONDS).toBe(24 * 60 * 60);
    const before = Date.now();
    const exp = verificationExpiresAt();
    const after = Date.now();
    const want = VERIFICATION_TTL_SECONDS * 1000;
    expect(exp.getTime() - before).toBeGreaterThanOrEqual(want - 1000);
    expect(exp.getTime() - after).toBeLessThanOrEqual(want + 1000);
  });

  it("builds a /verify-email URL with the token URL-encoded", () => {
	vi.stubEnv("APP_URL", "https://localhost:8443");
    const token = "a b/\u0029\u4e2d+title?";
    const url = verificationUrl(token);
    expect(url.startsWith("https://localhost:8443/verify-email?token=")).toBe(
      true,
    );
    expect(url).toContain(encodeURIComponent(token));
  });

  it("uses APP_URL when configured", () => {
    vi.stubEnv("APP_URL", "https://app.example.com");
    expect(verificationUrl("tok").startsWith("https://app.example.com")).toBe(
      true,
    );
  });
});

describe("password reset tokens", () => {
  it("generates 43-char base64url tokens that differ per call", () => {
    const a = generatePasswordResetToken();
    const b = generatePasswordResetToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hashes tokens one-way to 64 hex chars", () => {
    const h = hashPasswordResetToken("tok");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(createHash("sha256").update("tok").digest("hex"));
    expect(hashPasswordResetToken("tok")).toBe(hashPasswordResetToken("tok"));
  });

  it("expires after PASSWORD_RESET_TTL_SECONDS (30 minutes)", () => {
    expect(PASSWORD_RESET_TTL_SECONDS).toBe(30 * 60);
    const want = PASSWORD_RESET_TTL_SECONDS * 1000;
    expect(passwordResetExpiresAt().getTime() - Date.now()).toBeGreaterThan(
      want - 1000,
    );
    expect(passwordResetExpiresAt().getTime() - Date.now()).toBeLessThan(
      want + 1000,
    );
  });

  it("builds a /password-reset URL with the token URL-encoded", () => {
    vi.stubEnv("APP_URL", "https://localhost:8443");
    const token = randomBytes(32).toString("base64url");
    const url = passwordResetUrl(token);
    expect(url.startsWith("https://localhost:8443/password-reset?token=")).toBe(
      true,
    );
    expect(url).toContain(encodeURIComponent(token));
  });

  it("uses APP_URL when configured", () => {
    vi.stubEnv("APP_URL", "https://reset.example.com");
    expect(
      passwordResetUrl("tok").startsWith("https://reset.example.com"),
    ).toBe(true);
  });
});
