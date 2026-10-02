import { getSessionToken, touchSession, validateSession } from "@/lib/auth/session";

/*
POST api/session/activity

Refresh lastUsedAt for any REAL user activity. The only caller of touchSession:
every other route validates read-only.

SessionGuard sends this only on deliberate gestures (pointerdown / keydown).
The read-only GET /api/session poll never touches, so an open-but-idle tab
(or a background one) still expires after IDLE_TIMEOUT_MS.
*/
export async function POST() {
  const token = await getSessionToken();
  if (!token) return Response.json({ signedIn: false });

  const session = await validateSession(token);
  if (session) await touchSession(session);
  return Response.json({ signedIn: session !== null });
}
