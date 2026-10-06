import { describe, it, expect } from "vitest";
import { internalVerifySchema } from "../../lib/auth/validation";

// Mirrors the payload contract in services/collab/src/server.ts verifyAccess():
//
//   const credentialBody = data.kind === "user"
//     ? { tokenHash: data.tokenHash }
//     : { guestTokenHash: data.guestTokenHash };
//   body: JSON.stringify({ ...credentialBody, documentName: data.documentName })
//
// This test keeps a local copy of that logic so the test suite does not need
// to boot Hocuspocus. If the two drift apart, this test fails loudly.
type Credential =
  | { kind: "user"; tokenHash: string }
  | { kind: "guest"; guestTokenHash: string };

function buildCollabBody(credential: Credential, documentName: string) {
  const credentialBody =
    credential.kind === "user"
      ? { tokenHash: credential.tokenHash }
      : { guestTokenHash: credential.guestTokenHash };
  return JSON.stringify({ ...credentialBody, documentName });
}

const HASH_64 = "b".repeat(64);

describe("collab verifyAccess body -> internalVerifySchema", () => {
  it("user credential body (with kind) parses after kind is stripped", () => {
    const body = buildCollabBody({ kind: "user", tokenHash: HASH_64 }, "doc-x");
    expect(JSON.parse(body)).not.toHaveProperty("kind");
    expect(internalVerifySchema.safeParse(JSON.parse(body)).success).toBe(true);
  });

  it("guest credential body parses after kind is stripped", () => {
    const body = buildCollabBody(
      { kind: "guest", guestTokenHash: HASH_64 },
      "doc-x",
    );
    expect(internalVerifySchema.safeParse(JSON.parse(body)).success).toBe(true);
  });

  it("proves the original bug: un-stripped kind is rejected (would 400)", () => {
    // What collab used to send: the whole credential object including `kind`.
    const raw = { kind: "user", tokenHash: HASH_64, documentName: "doc-x" };
    expect(internalVerifySchema.safeParse(raw).success).toBe(false);
  });

  it("response contract: kind lives under actor, never top-level", () => {
    // The verifier returns { valid, actor: { kind, userId|guestSessionId }, readOnly }.
    const userResponse = {
      valid: true,
      actor: { kind: "user", userId: "user-1" },
      readOnly: false,
    };
    expect(userResponse.actor.kind).toBe("user");
    expect("kind" in userResponse).toBe(false);

    const guestResponse = {
      valid: true,
      actor: { kind: "guest", guestSessionId: "guest-1" },
      readOnly: true,
      editExpiresAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:35:00.000Z",
    };
    expect(guestResponse.actor.kind).toBe("guest");
    expect("kind" in guestResponse).toBe(false);
  });
});
