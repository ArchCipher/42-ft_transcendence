import "server-only"

import { getGuestSessionToken, validateGuestSession, type GuestSessionMode } from "@/lib/auth/guest-session"
import { getSessionToken, validateSession } from "@/lib/auth/session"

export type UserDocumentActor = {
  kind: "user"
  userId: string
  username: string
  avatarUrl: string | null;
}

export type GuestDocumentActor = {
  kind: "guest"
  guestSessionId: string
  mode: GuestSessionMode
  editExpiresAt: Date
  expiresAt: Date
}

export type DocumentActor = UserDocumentActor | GuestDocumentActor

// A normal session wins when both cookies are present. Successful login claims
// the guest document immediately afterwards, and this precedence avoids
// accidentally using a stale browser guest identity for another user's page.
export async function getCurrentDocumentActor(): Promise<DocumentActor | null> {
  const [sessionToken, guestToken] = await Promise.all([
    getSessionToken(),
    getGuestSessionToken(),
  ])

  const [session, guestSession] = await Promise.all([
    validateSession(sessionToken),
    validateGuestSession(guestToken),
  ])

  if (session?.user?.id) {
    return {
      kind: "user",
      userId: session.user.id,
      username: session.user.username,
	  avatarUrl: session.user.avatarUrl ?? null,
    }
  }

  if (!guestSession) return null

  return {
    kind: "guest",
    guestSessionId: guestSession.id,
    mode: guestSession.mode,
    editExpiresAt: guestSession.editExpiresAt,
    expiresAt: guestSession.expiresAt,
  }
}
