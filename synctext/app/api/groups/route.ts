import { prisma as db } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/api/responses";
import type { GroupSummary } from "@/lib/groups/types";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/groups

  GET   -> 200 GroupSummary[]        every group the caller belongs to,
                                     the private one first, then by name
        -> 401 { error }

  Never 404: everyone has at least their private group, so the list is
  never empty.
*/

// Built from memberships, not from the documents: a group holding no documents
// still has to appear, or it could never receive its first one.
export async function GET() {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const memberships = await db.groupMember.findMany({
    where: { userId: session.user.id },
    select: {
      role: true,
      group: {
        select: {
          id: true,
          name: true,
          privateForUserId: true,
          _count: { select: { documents: true } },
        },
      },
    },
  });

  const groups: GroupSummary[] = memberships.map(({ role, group }) => ({
    id: group.id,
    name: group.name,
    // Derived here: privateForUserId never reaches the client.
    isPrivate: group.privateForUserId !== null,
    myRole: role,
    documentCount: group._count.documents,
  }));

  groups.sort((a, b) =>
    a.isPrivate === b.isPrivate
      ? a.name.localeCompare(b.name)
      : Number(b.isPrivate) - Number(a.isPrivate),
  );

  return NextResponse.json(groups);
}
