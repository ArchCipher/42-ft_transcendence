import { describe, it, expect } from "vitest";

import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  loginSchema,
  registerSchema,
  emailRequestSchema,
  passwordResetSchema,
  verifyEmailSchema,
  validationError,
} from "../../lib/auth/validation";

const STRONG_PW = "wB7#nQz2!xLp9@vRt4$cK6";

describe("emailSchema", () => {
  it.each([
    "alice@example.com",
    "a@b.co",
    "first.last+tag@sub.example.dev",
    "local@xn--bcher-kva.example",
  ])("accepts %s", (email) => {
    expect(emailSchema.safeParse(email).success).toBe(true);
  });

  it.each(["plainaddress", "user@", "@example.com", "user@exa mple.com", ""])(
    "rejects malformed %s",
    (email) => {
      expect(emailSchema.safeParse(email).success).toBe(false);
    },
  );

  it("accepts a 63-char local part", () => {
    const email = `${"a".repeat(63)}@example.com`;
    expect(emailSchema.safeParse(email).success).toBe(true);
  });

  it("rejects a local part longer than 63 chars", () => {
    const email = `${"a".repeat(64)}@example.com`;
    expect(emailSchema.safeParse(email).success).toBe(false);
  });

  it("rejects a total length over 254 even with valid labels", () => {
    const domain = ["a".repeat(63), "a".repeat(63), "a".repeat(63), "b"].join(
      ".",
    );
    const email = `${"a".repeat(63)}@${domain}`; // 63+1+193 = 257 chars
    expect(email.length).toBeGreaterThan(254);
    expect(emailSchema.safeParse(email).success).toBe(false);
  });

  it("rejects a domain label starting or ending with a hyphen", () => {
    expect(emailSchema.safeParse("a@-example.com").success).toBe(false);
    expect(emailSchema.safeParse("a@example-.com").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("requires at least 8 characters", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("caps at 128 characters (argon2 DoS guard)", () => {
    expect(passwordSchema.safeParse("x".repeat(128)).success).toBe(true);
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
  });
});

describe("usernameSchema", () => {
  it("requires 3-32 chars of [a-zA-Z0-9_]", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("ab1").success).toBe(true);
    expect(usernameSchema.safeParse("UPPER_case123").success).toBe(true);
    expect(usernameSchema.safeParse("x".repeat(33)).success).toBe(false);
  });

  it.each(["has space", "h@x", "a-b", ""])("rejects %s", (name) => {
    expect(usernameSchema.safeParse(name).success).toBe(false);
  });
});

describe("loginSchema (strict)", () => {
  it("accepts valid credentials", () => {
    const r = loginSchema.safeParse({
      email: "a@example.com",
      password: "somepassword123",
    });
    expect(r.success).toBe(true);
  });

  it("rejects extra fields (parameter pollution)", () => {
    expect(
      loginSchema.safeParse({
        email: "a@example.com",
        password: "somepassword123",
        role: "admin",
      }).success,
    ).toBe(false);
  });

  it("rejects a missing or invalid password / email", () => {
    expect(loginSchema.safeParse({ email: "a@example.com" }).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "x".repeat(12) })
        .success,
    ).toBe(false);
  });
});

describe("registerSchema (strict + strength refine)", () => {
  it("accepts a strong password with valid identity fields", () => {
    const r = registerSchema.safeParse({
      email: "alice@example.com",
      username: "alice",
      password: STRONG_PW,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a weak password even with valid fields", () => {
    const r = registerSchema.safeParse({
      email: "alice@example.com",
      username: "alice",
      password: "password",
    });
    expect(r.success).toBe(false);
  });

  it("rejects passwords derived from the username", () => {
    const r = registerSchema.safeParse({
      email: "alice@example.com",
      username: "alice",
      password: "alice2024#",
    });
    expect(r.success).toBe(false);
  });

  it("rejects extra fields", () => {
    expect(
      registerSchema.safeParse({
        email: "alice@example.com",
        username: "alice",
        password: STRONG_PW,
        admin: true,
      }).success,
    ).toBe(false);
  });
});

describe("emailRequestSchema", () => {
  it("accepts an email and rejects extra fields", () => {
    expect(emailRequestSchema.safeParse({ email: "a@example.com" }).success).toBe(true);
    expect(
      emailRequestSchema.safeParse({ email: "a@example.com", x: 1 }).success,
    ).toBe(false);
  });
});

describe("passwordResetSchema", () => {
  it("accepts a 16+ char token with a strong password", () => {
    expect(
      passwordResetSchema.safeParse({
        token: "0123456789abcdef",
        password: STRONG_PW,
      }).success,
    ).toBe(true);
  });

  it("rejects a token shorter than 16 chars", () => {
    expect(
      passwordResetSchema.safeParse({
        token: "0123456789abcde",
        password: STRONG_PW,
      }).success,
    ).toBe(false);
  });

  it("rejects a token longer than 256 chars", () => {
    expect(
      passwordResetSchema.safeParse({
        token: "a".repeat(257),
        password: STRONG_PW,
      }).success,
    ).toBe(false);
  });

  it("rejects a weak password and extra fields", () => {
    expect(
      passwordResetSchema.safeParse({
        token: "0123456789abcdef",
        password: "password",
      }).success,
    ).toBe(false);
    expect(
      passwordResetSchema.safeParse({
        token: "0123456789abcdef",
        password: STRONG_PW,
        extra: 1,
      }).success,
    ).toBe(false);
  });
});

describe("verifyEmailSchema", () => {
  it("accepts a server-issued opaque token", () => {
    expect(verifyEmailSchema.safeParse({ token: "0123456789abcdef" }).success).toBe(true);
  });

  it("rejects a short token and extra fields", () => {
    expect(verifyEmailSchema.safeParse({ token: "0123456789abcde" }).success).toBe(false);
    expect(
      verifyEmailSchema.safeParse({ token: "0123456789abcdef", x: 1 }).success,
    ).toBe(false);
  });
});

describe("validationError", () => {
  it("returns per-field arrays from a failed parse", () => {
    const r = loginSchema.safeParse({ email: "bad", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = validationError(r.error);
      expect(Array.isArray(fields.email)).toBe(true);
      expect(fields.email?.length).toBeGreaterThan(0);
      expect(Array.isArray(fields.password)).toBe(true);
    }
  });

  it("returns an empty map for a parse that succeeds", () => {
    const r = loginSchema.safeParse({
      email: "a@example.com",
      password: "somepassword123",
    });
    expect(r.success).toBe(true);
  });
});
