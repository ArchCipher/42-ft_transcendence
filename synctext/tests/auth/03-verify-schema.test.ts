import { describe, it, expect } from "vitest";
import { internalVerifySchema } from "../../lib/auth/validation";

const HASH_64 = "a".repeat(64); // SHA-256 hex digest shape

function parse(body: unknown) {
  return internalVerifySchema.safeParse(body);
}

describe("internalVerifySchema (collab -> verify endpoint contract)", () => {
  it("accepts a valid user credential", () => {
    const r = parse({ tokenHash: HASH_64, documentName: "doc-abc123" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tokenHash).toBe(HASH_64);
  });

  it("accepts a valid guest credential", () => {
    const r = parse({ guestTokenHash: HASH_64, documentName: "doc-abc123" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.guestTokenHash).toBe(HASH_64);
  });

  it("rejects when both credentials are present", () => {
    expect(parse({ tokenHash: HASH_64, guestTokenHash: HASH_64, documentName: "d" }).success).toBe(false);
  });

  it("rejects when neither credential is present", () => {
    expect(parse({ documentName: "d" }).success).toBe(false);
  });

  it("rejects the `kind` field (strict schema)", () => {
    // CRITICAL contract guard: the collab caller must NOT send `kind`; the
    // zod `.strict()` schema rejects any undeclared field. If collab ever
    // regresses to JSON.stringify({...credential, documentName}) this fails.
    expect(parse({ kind: "user", tokenHash: HASH_64, documentName: "d" }).success).toBe(false);
    expect(parse({ kind: "guest", guestTokenHash: HASH_64, documentName: "d" }).success).toBe(false);
  });

  it("rejects arbitrary unknown fields too", () => {
    expect(parse({ tokenHash: HASH_64, documentName: "d", evil: true }).success).toBe(false);
  });

  it("rejects a hash that is too short", () => {
    expect(parse({ tokenHash: "a".repeat(15), documentName: "d" }).success).toBe(false);
  });

  it("rejects a hash that is too long", () => {
    expect(parse({ tokenHash: "a".repeat(257), documentName: "d" }).success).toBe(false);
  });

  it("rejects a non-string hash", () => {
    expect(parse({ tokenHash: 42, documentName: "d" }).success).toBe(false);
    expect(parse({ tokenHash: null, documentName: "d" }).success).toBe(false);
  });

  it("rejects a missing or empty documentName", () => {
    expect(parse({ tokenHash: HASH_64 }).success).toBe(false);
    expect(parse({ tokenHash: HASH_64, documentName: "" }).success).toBe(false);
  });

  it("rejects a documentName longer than 64 chars", () => {
    expect(parse({ tokenHash: HASH_64, documentName: "d".repeat(65) }).success).toBe(false);
  });

  it("rejects a non-JSON body (safeParse of null)", () => {
    expect(parse(null).success).toBe(false);
    expect(parse("nonsense").success).toBe(false);
  });
});
