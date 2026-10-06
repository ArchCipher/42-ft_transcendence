import { createHash, randomBytes } from "node:crypto";
import { appUrl } from "@/lib/env";

export const PASSWORD_RESET_TTL_SECONDS = 30 * 60; // 30 mins

/*
Password Reset Token generation

Create new opaque token: 32 random bytes = 256 bits of entropy
- OWASP input validation >= 32 chars, secure RNG, single use, time limited
*/
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url"); // 43 chars
}

// Hashed token for DB storage, so DB leak wouldn't reset a password
export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Token TTL
export function passwordResetExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000); // in ms
}

export function passwordResetUrl(token: string) {
  return appUrl(`/password-reset?token=${encodeURIComponent(token)}`);
}
