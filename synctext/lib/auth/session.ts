import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma as db } from "@synctext/db";
import type { Session, User } from "@synctext/db";

// Cookie name must match in setSessionCookie(), getSessionToken(), clearSessionCookie
export const SESSION_COOKIE_NAME = "session";

// Session lifetime in seconds
// cookie `maxAge` and DB `expiresAt` both should use this
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Max sessions per user
export const MAX_SESSIONS = 5;

/*
Token generation

Create new opaque token: 32 random bytes = 256 bits of entropy

- OWASP session management >= 64 bits entropy
- OAuth PKCE (RFC 7636, Sec 7.1): 32 random octets, base64url -> 43 chars

Encoding used:
  - In cookie: base64url, 32 bytes -> 43 chars. Compact and safe in cookies and
    URLs ('-', '_' replace '+', '/', no '=' padding). Plain base64 would be
    44 chars (3 bytes -> 4 chars, one '=' padding)
  - In DB: hex, 32 bytes -> 64 chars. Readable, URL safe, convention for hashes
*/
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

// Hashed token for DB storage, so DB leak would not create usable sessions.
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Token TTL
export function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000); // in ms
}

// Cookie options
// `secure` only in `production` so `http://localhost` works and stays on http
const options = {
  httpOnly: true, // JS can't read it (anti-XSS)
  secure: process.env.NODE_ENV === "production", // HTTPS only
  sameSite: "strict", // not sent cross-site (anti-CSRF)
  path: "/",
  maxAge: SESSION_TTL_SECONDS, // match DB `expiresAt` column
} as const;

// Add session cookie to response (call after successful login)
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, options);
}

// Read token on each request
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

// Remove the cookie (logout). Caller should revoke DB row
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

// Validate token from request cookie: on every use update `lastUsedAt`, so that
// `online status` and `idle-timeout` works
export async function validateSession(
  token: string | null,
): Promise<(Session & { user: User }) | null> {
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt !== null || session.expiresAt < new Date())
    return null;
  await db.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });
  return session;
}
