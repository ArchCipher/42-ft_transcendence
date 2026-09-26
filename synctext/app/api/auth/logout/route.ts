import { NextResponse } from "next/server";
import { logoutCurrentSession } from "@/lib/auth/session";

/*
API Response contracts: /api/auth/logout

    POST - used by client (logoutClient)
	Request:  (none - reads session from cookie)
	Response:
		200 → { ok: true }
		500 → { error } (unhandled server error)

	GET — used by requireSession to auto-logout
	A Server Component render cannot delete cookies, so the guard redirects
	here instead and this handler does the cleanup.
*/

export async function POST() {
  await logoutCurrentSession();
  return Response.json({ ok: true }, { status: 200 });
}

export async function GET(request: Request) {
  await logoutCurrentSession();
  return NextResponse.redirect(
    new URL("/auth?verify=logged-out", request.url),
    303,
  );
}
