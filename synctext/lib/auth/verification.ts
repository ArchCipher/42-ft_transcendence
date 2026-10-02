import { createHash, randomBytes } from "node:crypto";
import { appUrl } from "@/lib/env";

export const VERIFICATION_TTL_SECONDS = 24 * 60 * 60; // 1 day

/*
Email Verification Token generation

Create new opaque token: 32 random bytes = 256 bits of entropy
- OWASP input validation >= 32 chars, secure RNG, single use, time limited
*/
export function generateVerificationToken(): string {
  return randomBytes(32).toString("base64url"); // 43 chars
}

// Hashed token for DB storage, so DB leak wouldn't verify an email
export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Token TTL
export function verificationExpiresAt(): Date {
  return new Date(Date.now() + VERIFICATION_TTL_SECONDS * 1000); // in ms
}

export function verificationUrl(token: string) {
  return appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
}
