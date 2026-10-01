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
import { canAdminGroup, requireGroupRole } from "@/lib/permissions";
import { addMember } from "@/lib/groups/groups";
import { ROLE_RANK, type GroupMemberSummary } from "@/lib/groups/types";
import { isOnline } from "@/lib/presence";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/groups/[id]/members

  GET   -> 200 GroupMemberSummary[]  owner, then admins, then members;
                                     oldest first within a rank
        -> 401 { error }
        -> 404 { error }             caller is not a member of this group

  POST  { userId }                   canAdminGroup; always added as MEMBER
        -> 201 { userId, role }
        -> 400 { error }             userId missing or not a string
        -> 401 { error }
        -> 403 { error }             member, but not an admin or the owner
        -> 404 { error }             not a member of this group, or userId is
                                     not an accepted friend of the caller
        -> 409 { error }             already a member, or a private space
*/

// Any member of a group may see who else is in it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const callerRole = await requireGroupRole(db, session.user.id, id);
  if (!callerRole) return notFound("Group");

  const members = await db.groupMember.findMany({
    where: { groupId: id },
    select: {
      role: true,
      joinedAt: true,
      user: { select: { id: true, username: true, avatarUrl: true, lastSeenAt: true } },
    },
    // Ordered here, then ranked below; Array.sort is stable, so the oldest
    // member stays first inside each rank.
    orderBy: [{ joinedAt: "asc" }],
  });

  const summaries: GroupMemberSummary[] = members
    .map(({ role, joinedAt, user }) => ({
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      online: isOnline(user.lastSeenAt),
      role,
      joinedAt: joinedAt.toISOString(),
    }))
    .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);

  return NextResponse.json(summaries);
}

// Add one of the caller's accepted friends as a plain member.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const body = await readJson(request);
  if (
    typeof body !== "object" ||
    body === null ||
    !("userId" in body) ||
    typeof body.userId !== "string"
  ) {
    return badRequest("userId must be a string");
  }

  const { id } = await params;
  const callerRole = await requireGroupRole(db, session.user.id, id);
  if (!callerRole) return notFound("Group");
  if (!canAdminGroup(callerRole)) return forbidden();

  const result = await addMember(db, id, body.userId, session.user.id);
  if (result === "private") return conflict("A private space cannot have other members");
  if (result === "not_friend") return notFound("Friend");
  if (result === "already_member") return conflict("Already a member");

  return NextResponse.json({ userId: body.userId, role: GroupRole.MEMBER }, { status: 201 });
}
