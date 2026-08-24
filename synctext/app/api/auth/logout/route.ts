import {
  clearSessionCookie,
  getSessionToken,
  hashSessionToken,
} from "@/lib/auth/session";
import { prisma as db } from "@synctext/db";

/*
API Response contracts: POST /api/auth/logout

	Request:  (none - reads session from cookie)
	Response:
		200 → { ok: true }
		500 → { error } (unhandled server error)
*/

export async function POST() {
  const token = await getSessionToken();

  await clearSessionCookie();

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

  return Response.json({ ok: true }, { status: 200 });
}
