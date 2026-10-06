import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma as db } from "@synctext/db";
import type { Document, GuestSession } from "@synctext/db";
import {
  GUEST_EDIT_TTL_MS,
  GUEST_SESSION_COOKIE_NAME,
  GUEST_SESSION_TTL_MS,
  hashGuestSessionToken,
} from "@synctext/shared";

export type GuestSessionMode = "EDITABLE" | "READ_ONLY";
export type GuestSessionStatus = GuestSessionMode | "EXPIRED";

export type ValidGuestSession = GuestSession & {
  document: Document | null;
  mode: GuestSessionMode;
};

/** Generate a 256-bit opaque token suitable for a browser cookie. */
export function generateGuestSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function guestEditExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + GUEST_EDIT_TTL_MS);
}

export function guestSessionExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + GUEST_SESSION_TTL_MS);
}

export function getGuestSessionStatus(
  session: Pick<GuestSession, "editExpiresAt" | "expiresAt">,
  now: Date = new Date(),
): GuestSessionStatus {
  if (session.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  if (session.editExpiresAt.getTime() <= now.getTime()) return "READ_ONLY";
  return "EDITABLE";
}

const guestSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",  // Oauth doesn't redirect correctly to dashboard without lax
  path: "/",
} as const;

export async function setGuestSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(GUEST_SESSION_COOKIE_NAME, token, guestSessionCookieOptions);
}

export async function getGuestSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearGuestSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_SESSION_COOKIE_NAME);
}

/**
 * Resolve a guest cookie to its active temporary document. Expired sessions
 * deliberately resolve to null; callers that need an expired screen should
 * load the document only after independently proving guest ownership.
 */
export async function validateGuestSession(
  token: string | null,
): Promise<ValidGuestSession | null> {
  if (!token) return null;

  const session = await db.guestSession.findUnique({
    where: { tokenHash: hashGuestSessionToken(token) },
    include: { document: true },
  });
  if (!session) return null;

  const mode = getGuestSessionStatus(session);
  if (mode === "EXPIRED") return null;

  return { ...session, mode };
}
