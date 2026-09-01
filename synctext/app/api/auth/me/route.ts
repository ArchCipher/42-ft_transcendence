import { NextResponse } from "next/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { identityFromUser } from "@/lib/sync/sync-user";

// Identity of the signed-in visitor (name + color for the collaboration
// caret) — the static doc pages can't read the session themselves, so the
// client fetches this after mount instead.
export async function GET() {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(identityFromUser(session.user));
}
