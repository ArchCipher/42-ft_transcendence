import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hashPassword,
  verifyPassword,
  getDummyHash,
} from "../../lib/auth/password";

// Structural check: argon2id encoded form with the three cost params. Exact
// cost values are deployment tuning (OWASP minimum is m=19456,t=2,p=1), so we
// assert the format, not the tuned numbers.
const ARGON2ID_FORMAT = /^\$argon2id\$v=19\$m=\d+,p=\d+,t=\d+\$/;

describe("hashPassword (Argon2id)", () => {
  it(
    "produces an argon2id v19 hash with encoded cost params",
    { timeout: 15_000 },
    async () => {
      const hash = await hashPassword("correct horse battery staple");
      expect(hash).toMatch(ARGON2ID_FORMAT);
      expect(hash.length).toBeGreaterThan(80);
    },
  );

  it(
    "uses a random salt: same password hashes differently",
    { timeout: 15_000 },
    async () => {
      const a = await hashPassword("same-password-123!");
      const b = await hashPassword("same-password-123!");
      expect(a).not.toBe(b);
    },
  );

  it(
    "verifies the correct password and rejects the wrong one",
    { timeout: 15_000 },
    async () => {
      const hash = await hashPassword("s3cret-pw");
      await expect(verifyPassword("s3cret-pw", hash)).resolves.toBe(true);
      await expect(verifyPassword("wrong-pw", hash)).resolves.toBe(false);
    },
  );

  it("treats a corrupt hash as a wrong password instead of throwing", async () => {
    await expect(verifyPassword("anything", "not-a-valid-hash")).resolves.toBe(
      false,
    );
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
    await expect(verifyPassword("anything", "$argon2id$broken")).resolves.toBe(
      false,
    );
  });

  it("dummy hash is cached, valid argon2id, and only matches its own password", async () => {
    const first = await getDummyHash();
    const second = await getDummyHash();
    expect(first).toBe(second);
    expect(first).toMatch(ARGON2ID_FORMAT);
    // anti-enumeration: a wrong password still costs a verify against dummy
    await expect(verifyPassword("totally-different", first)).resolves.toBe(
      false,
    );
  });
});
