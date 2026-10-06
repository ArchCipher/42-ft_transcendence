import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma as db } from "@synctext/db";
import type { Session, User } from "@synctext/db";
import {
  hashSessionToken,
  SESSION_TTL_SECONDS,
  IDLE_TIMEOUT_MS,
  SESSION_COOKIE_NAME,
  SESSION_LAST_USED_UPDATE_THRESHOLD,
} from "@synctext/shared";

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

// Token TTL
export function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000); // in ms
}

// Cookie options
// `secure` only in `production` so `http://localhost` works and stays on http
const options = {
  httpOnly: true, // JS can't read it (anti-XSS)
  secure: process.env.NODE_ENV === "production", // HTTPS only
  sameSite: "lax", // Oauth doesn't redirect correctly to dashboard without lax
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

// Note: this takes a hashed session token
export async function checkSessionByHash(
  tokenHash: string,
): Promise<(Session & { user: User }) | null> {
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  // invalid session
  if (!session || session.revokedAt !== null || session.expiresAt < new Date())
    return null;
  // idle session
  if (
    session.lastUsedAt &&
    Date.now() - session.lastUsedAt.getTime() > IDLE_TIMEOUT_MS
  )
    return null;
  return session;
}

// explicit refresh - call ONLY on real user activity
// update lastUsedAt ONLY every SESSION_LAST_USED_UPDATE_THRESHOLD
export async function touchSession(session: {
  id: string;
  lastUsedAt: Date | null;
}): Promise<void> {
  if (
    !session.lastUsedAt ||
    Date.now() - session.lastUsedAt.getTime() >
      SESSION_LAST_USED_UPDATE_THRESHOLD
  ) {
    await db.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
  }
}

// Validate token from request cookie. Read-only: polled API calls must not keep an
// idle session alive, so only POST /api/session/activity calls touchSession.
// Note: this takes raw session token
export async function validateSession(
  token: string | null,
): Promise<(Session & { user: User }) | null> {
  if (!token) return null;

  return checkSessionByHash(hashSessionToken(token));
}

/*
Logout session (clear cookie and remove DB row)
Safe to call when session is invalid/expired/idle/logout
*/
export async function logoutCurrentSession(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    try {
      await db.session.updateMany({
        where: { tokenHash: hashSessionToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      }); // revoke session
    } catch (error) {
      console.error("[session] revoke failed:", error);
    }
  }
  await clearSessionCookie();
}
