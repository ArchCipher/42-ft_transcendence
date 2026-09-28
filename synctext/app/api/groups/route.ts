import { prisma as db, GroupRole } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { badRequest, readJson, readName, unauthorized } from "@/lib/api/responses";
import { createGroup } from "@/lib/groups/groups";
import type { GroupSummary } from "@/lib/groups/types";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/groups

  GET   -> 200 GroupSummary[]        every group the caller belongs to,
                                     the private space first, then by name
        -> 401 { error }

  Never 404: everyone has at least their private space, so the list is
  never empty.

  POST  { name }                     any signed-in user, who becomes its owner
        -> 201 GroupSummary
        -> 400 { error }             name empty or over 120 chars
        -> 401 { error }
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
          isPrivateSpace: true,
          _count: { select: { documents: true } },
        },
      },
    },
  });

  const groups: GroupSummary[] = memberships.map(({ role, group }) => ({
    id: group.id,
    name: group.name,
    isPrivateSpace: group.isPrivateSpace,
    myRole: role,
    documentCount: group._count.documents,
  }));

  groups.sort((a, b) =>
    a.isPrivateSpace === b.isPrivateSpace
      ? a.name.localeCompare(b.name)
      : Number(b.isPrivateSpace) - Number(a.isPrivateSpace),
  );

  return NextResponse.json(groups);
}

// Create a shared group. The caller is its owner and only member.
export async function POST(request: Request) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const name = readName(await readJson(request));
  if (!name) return badRequest("Name must be between 1 and 120 characters");

  const group = await createGroup(db, session.user.id, name);

  const summary: GroupSummary = {
    id: group.id,
    name,
    isPrivateSpace: false,
    myRole: GroupRole.OWNER,
    documentCount: 0,
  };
  return NextResponse.json(summary, { status: 201 });
}
