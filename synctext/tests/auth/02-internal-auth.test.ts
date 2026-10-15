import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { isAuthorized } from "../../lib/auth/internal";

const SECRET = "super-secret-internal-token-0123456789abcdef";

function reqWithHeader(value: string | null): Request {
  return new Request("http://localhost/x", {
    headers: value === null ? {} : { "x-internal-service-token": value },
  });
}

describe("isAuthorized (internal service token)", () => {
  beforeEach(() => {
    process.env.INTERNAL_SERVICE_TOKEN = SECRET;
  });
  afterEach(() => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
  });

  it("accepts the correct token", () => {
    expect(isAuthorized(reqWithHeader(SECRET))).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(isAuthorized(reqWithHeader("wrong-token"))).toBe(false);
  });

  it("rejects when the header is missing", () => {
    expect(isAuthorized(reqWithHeader(null))).toBe(false);
  });

  it("rejects when the env token is not configured (fail closed)", () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    expect(isAuthorized(reqWithHeader(SECRET))).toBe(false);
  });

  it("length mismatch returns false without throwing", () => {
    // Regression guard: timingSafeEqual throws ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH
    // on non-equal buffer lengths. The length check must run first.
    expect(() => isAuthorized(reqWithHeader("short"))).not.toThrow();
    expect(isAuthorized(reqWithHeader("short"))).toBe(false);
  });

  it("empty vs non-empty mismatch does not throw", () => {
    expect(() => isAuthorized(reqWithHeader(""))).not.toThrow();
    expect(isAuthorized(reqWithHeader(""))).toBe(false);
  });
});
