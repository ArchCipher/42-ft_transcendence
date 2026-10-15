import { describe, it, expect } from "vitest";
import { isPasswordStrong, MIN_SCORE } from "../../lib/auth/password-strength";

describe("isPasswordStrong (zxcvbn)", () => {
  it("enforces min strength score 3 before green-lighting a password", () => {
    expect(MIN_SCORE).toBe(3);
  });

  it.each(["password", "12345678", "qwertyuiop", "abcdefgh", "aaaaaaaa"])(
    "rejects weak password %s",
    (pw) => {
      expect(isPasswordStrong(pw).ok).toBe(false);
    },
  );

  it("flags passwords derived from the user's own info (email/username)", () => {
    // "alice2026" is guessable from userInput "alice"
    const r = isPasswordStrong("alice2026#", ["alice@example.com", "alice"]);
    expect(r.ok).toBe(false);
  });

  it("accepts an unrelated strong random-looking password", () => {
    const pw = "wB7#nQz2!xLp9@vRt4$cK6";
    const r = isPasswordStrong(pw, ["alice@example.com", "alice"]);
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(MIN_SCORE);
  });

  it("returns a string feedback with suggestions", () => {
    const r = isPasswordStrong("password");
    expect(typeof r.feedback).toBe("string");
    expect(r.feedback.length).toBeGreaterThan(0);
  });
});
