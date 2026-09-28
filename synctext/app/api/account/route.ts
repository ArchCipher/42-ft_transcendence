import { prisma as db } from "@synctext/db";
import { clearSessionCookie, getSessionToken, validateSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/api/responses";
import { deleteUser } from "@/lib/groups/ownership";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/account

  DELETE                             the caller's own account: private
                                     documents and groups left alone are
                                     deleted, owned groups pass on
        -> 204
        -> 401 { error }
*/

// Delete the caller's account. Sessions go by cascade, so only the cookie is left.
export async function DELETE() {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  await deleteUser(db, session.user.id);
  await clearSessionCookie();

  return new NextResponse(null, { status: 204 });
}
