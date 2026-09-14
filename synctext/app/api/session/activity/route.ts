import { getSessionToken, validateSession } from "@/lib/auth/session";

/*
POST api/session/activity

Refresh lastUsedAt (via validateSession) for any REAL user activity.

SessionGuard sends this only on deliberate gestures (pointerdown / keydown).
The read-only GET /api/session poll never touches, so an open-but-idle tab
(or a background one) still expires after IDLE_TIMEOUT_MS.
*/
export async function POST() {
  const token = await getSessionToken();
  if (!token) return Response.json({ signedIn: false });

  const session = await validateSession(token);
  return Response.json({ signedIn: session !== null });
}
