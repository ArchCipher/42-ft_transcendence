import { getSessionToken, touchSession, validateSession } from "@/lib/auth/session";
import { prisma as db } from "@synctext/db";

/*
POST api/session/activity

Refresh session activity (lastUsedAt) and presence (lastSeenAt) for any REAL
user activity. The only caller of touchSession: every other route validates
read-only.

SessionGuard sends this when an authenticated page becomes visible and on
deliberate gestures. The read-only GET /api/session poll never touches, so an
open-but-idle tab (or a background one) still expires after IDLE_TIMEOUT_MS.
*/
export async function POST() {
  const token = await getSessionToken();
  if (!token) return Response.json({ signedIn: false });

  const session = await validateSession(token);
  if (session) {
    await touchSession(session);
    await db.user.update({
      where: { id: session.userId },
      data: { lastSeenAt: new Date() },
    });
  }
  return Response.json({ signedIn: session !== null });
}
