/*
GET /api/session

Read-only session status used by the client-side SessionGuard (polling on
protected pages + on tab refocus).

When it detects a dead / idle session it also enforces the logout server-side
(revoke DB row + clear cookie) so the client just redirects to /auth.
*/

import {
  checkSessionByHash,
  getSessionToken,
  logoutCurrentSession,
} from "@/lib/auth/session";
import { hashSessionToken } from "@synctext/shared";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return Response.json({ signedIn: false });

  const session = await checkSessionByHash(hashSessionToken(token));
  if (!session) {
    await logoutCurrentSession();
    return Response.json({ signedIn: false });
  }

  return Response.json({ signedIn: true });
}
