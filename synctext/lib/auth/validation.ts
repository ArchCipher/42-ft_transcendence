/*
References:
  - OWASP Input Validation Cheat Sheet:
    syntactic + semantic validation, allowlist over denylist, length caps,
    email rules (local <= 63, total <= 254), validate as early as possible.
  - OWASP Authentication Cheat Sheet:
    generic error messages, rate limiting (NOT zod's job - route level).
  - The Copenhagen Book (password-authentication):
    min 8, max ~64-256, don't trim/truncate passwords, zxcvbn strength.
*/

import { z } from "zod";
import { isPasswordStrong } from "./password-strength";
import { USERNAME_MAX } from "@synctext/shared";

// ---- email --------------------------------------------------------------
// Syntactic validation only
export const emailSchema = z
  .string()
  .trim() // remove spaces before and after
  .toLowerCase() // canonical form
  .max(254, "Email is too long (max 254)")
  .pipe(z.email("Enter a valid email address"))
  .superRefine((value, ctx) => {
    const [local, ...rest] = value.split("@");
    const domain = rest.join("@");

    if (local.length > 63) {
      ctx.addIssue({
        code: "custom",
        message: "Email local part is too long (max 63)",
      });
    }

    // domain part contains only letters, numbers, hyphens and periods.
    // dot-separated labels, each 1-63 chars, not starting/ending with '-'
    const domainOk = domain
      .split(".")
      .every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label),
      );
    if (!domainOk) {
      ctx.addIssue({ code: "custom", message: "Email domain is invalid" });
    }
  });

// ---- password ------------------------------------------------------------
// Syntactic validation only
// The max cap is a DoS guard: hashing with argon2 is expensive
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long (max 128)");

// ---- username ------------------------------------------------------------
// Allowlist, not denylist. The regex is anchored so it validates the WHOLE
// string, and it avoids "any character" wildcards (ReDoS).
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase() // canonical form
  .min(3, "Username must be at least 3 characters")
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores");

// ---- forms ---------------------------------------------------------------
// .strict() rejects unknown keys so extra body fields fail the parse
// (parameter pollution).

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const registerSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    /*
    Semantic rule: the password must actually be hard to guess.
    zxcvbn is sync and fast, so it can live in the shared schema and run
    identically on client + server. email + username are passed: passwords
    derived from the user's own data are flagged.
    */
    const { ok, feedback } = isPasswordStrong(data.password, [
      data.email,
      data.username,
    ]);
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["password"], // client can highlight the right field
        message: feedback || "Password is too weak.",
      });
    }
  });

// used by forgot-password and resend-verification
export const emailRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

/*
passwordResetSchema doesn't pass username along with password to check passwords
derived from user's own data.
Reset route should run `isPasswordStrong(data.password, [email,username,]);`
with the full context from the token's user record.
*/
export const passwordResetSchema = z
  .object({
    token: z.string().min(16).max(256), // server-issued, opaque
    password: passwordSchema.superRefine((value, ctx) => {
      const { ok, feedback } = isPasswordStrong(value);
      if (!ok) {
        ctx.addIssue({
          code: "custom",
          message: feedback || "Password is too weak.",
        });
      }
    }),
  })
  .strict();

/*
verifyEmailSchema is server issued opaque string carried in the verification
email. High entropy and bound to a single user row, so token alone is enough
*/
export const verifyEmailSchema = z
  .object({
    token: z.string().min(16).max(256), // server-issued, opaque
  })
  .strict();

// ---- oauth ---------------------------------------------------------------

export const oauthStartSchema = z
  .object({
    purpose: z.enum(["signin", "link"]).default("signin"),
  })
  .strict();

export const oauthUnlinkSchema = z
  .object({
    provider: z.enum(["google"]),
  })
  .strict();

// ---- internal --------------------------------------------------------------

export const internalVerifySchema = z
  .object({
    tokenHash: z.string().min(16).max(256).optional(), // server-internal, collab pre-hashed
    guestTokenHash: z.string().min(16).max(256).optional(), // public-api
    documentName: z.string().min(1).max(64),
  })
  .strict()
  .superRefine((body, ctx) => {
    // exactly one credential must be present
    if (!!body.tokenHash === !!body.guestTokenHash) {
      ctx.addIssue({
        code: "custom",
        message: "Exactly one of tokenHash or guestTokenHash is required",
      });
    }
  });

// ---- types & helpers ------------------------------------------------------
// z.infer yields the OUTPUT type, i.e. after trim/toLowerCase transforms, so
// route handlers receive normalized values directly.

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EmailRequestInput = z.infer<typeof emailRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type OauthStartInput = z.infer<typeof oauthStartSchema>;
export type OauthUnlinkInput = z.infer<typeof oauthUnlinkSchema>;
export type InternalSessionVerifyInput = z.infer<typeof internalVerifySchema>;

// Stable JSON shape for the client: { error: "Validation failed", ... } per field.
export function validationError(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors;
}
