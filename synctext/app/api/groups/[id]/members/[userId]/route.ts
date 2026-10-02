import { prisma as db, GroupRole } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  readJson,
  unauthorized,
} from "@/lib/api/responses";
import { canAdminGroup, canOwnGroup, requireGroupRole } from "@/lib/permissions";
import { leaveGroup, removeMember, setMemberRole } from "@/lib/groups/groups";
import { transferOwnership } from "@/lib/groups/ownership";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/groups/[id]/members/[userId]

  PATCH { role: "OWNER" | "ADMIN" | "MEMBER" }
                                     canOwnGroup. OWNER transfers the group:
                                     the caller becomes an ADMIN.
        -> 200 { userId, role }
        -> 400 { error }             role is not OWNER, ADMIN or MEMBER
        -> 401 { error }
        -> 403 { error }             member, but not the owner
        -> 404 { error }             caller or target not a member of this group
        -> 409 { error }             the owner's role cannot be changed

  DELETE                             userId is the caller: leave the group,
                                     ownership passes on automatically.
                                     Otherwise canAdminGroup removes a member,
                                     canOwnGroup removes an admin.
        -> 204
        -> 401 { error }
        -> 403 { error }
        -> 404 { error }             caller or target not a member of this group
        -> 409 { error }             the owner cannot be removed, a private
                                     space cannot be left
*/

// Promote a member to admin, demote an admin, or hand the group over. Owner only.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const body = await readJson(request);
  if (
    typeof body !== "object" ||
    body === null ||
    !("role" in body) ||
    (body.role !== GroupRole.OWNER && body.role !== GroupRole.ADMIN && body.role !== GroupRole.MEMBER)
  ) {
    return badRequest("role must be OWNER, ADMIN or MEMBER");
  }
  const role = body.role;

  const { id, userId } = await params;
  const callerRole = await requireGroupRole(db, session.user.id, id);
  if (!callerRole) return notFound("Group");
  if (!canOwnGroup(callerRole)) return forbidden();

  const targetRole = await requireGroupRole(db, userId, id);
  if (!targetRole) return notFound("Member");
  if (targetRole === GroupRole.OWNER) return conflict("The owner's role cannot be changed");

  if (role === GroupRole.OWNER) {
    const result = await transferOwnership(db, id, session.user.id, userId);
    if (result === "not_member") return notFound("Member");
    if (result === "not_owner") return forbidden();
    return NextResponse.json({ userId, role });
  }

  if (!(await setMemberRole(db, id, userId, role))) return notFound("Member");

  return NextResponse.json({ userId, role });
}

// Leave the group when userId is the caller, otherwise remove that member.
// An admin removes plain members; only the owner removes an admin.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const { id, userId } = await params;

  if (userId === session.user.id) {
    const result = await leaveGroup(db, id, userId);
    if (result === "not_member") return notFound("Group");
    if (result === "private") return conflict("A private space cannot be left");
    return new NextResponse(null, { status: 204 });
  }

  const callerRole = await requireGroupRole(db, session.user.id, id);
  if (!callerRole) return notFound("Group");
  if (!canAdminGroup(callerRole)) return forbidden();

  const targetRole = await requireGroupRole(db, userId, id);
  if (!targetRole) return notFound("Member");
  if (targetRole === GroupRole.OWNER) return conflict("The owner cannot be removed");
  if (targetRole === GroupRole.ADMIN && !canOwnGroup(callerRole)) return forbidden();

  if (!(await removeMember(db, id, userId))) return notFound("Member");

  return new NextResponse(null, { status: 204 });
}
