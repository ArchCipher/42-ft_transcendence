import { prisma as db, GroupRole } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { notFound, unauthorized } from "@/lib/api/responses";
import { requireGroupRole } from "@/lib/permissions";
import type { GroupMemberSummary } from "@/lib/groups/types";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/groups/[id]/members

  GET   -> 200 GroupMemberSummary[]  owner, then admins, then members;
                                     oldest first within a rank
        -> 401 { error }
        -> 404 { error }             caller is not a member of this group
*/

const RANK: Record<GroupRole, number> = {
  [GroupRole.OWNER]: 0,
  [GroupRole.ADMIN]: 1,
  [GroupRole.MEMBER]: 2,
};

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
      user: { select: { id: true, username: true, avatarUrl: true } },
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
      role,
      joinedAt: joinedAt.toISOString(),
    }))
    .sort((a, b) => RANK[a.role] - RANK[b.role]);

  return NextResponse.json(summaries);
}
