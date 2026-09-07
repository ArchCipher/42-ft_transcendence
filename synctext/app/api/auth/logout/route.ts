import {
  logoutCurrentSession,
} from "@/lib/auth/session";


/*
API Response contracts: POST /api/auth/logout

	Request:  (none - reads session from cookie)
	Response:
		200 → { ok: true }
		500 → { error } (unhandled server error)
*/

export async function POST() {
  await logoutCurrentSession();
  return Response.json({ ok: true }, { status: 200 });
}
