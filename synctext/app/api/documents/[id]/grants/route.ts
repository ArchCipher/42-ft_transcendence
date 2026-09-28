import { prisma as db } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { notFound, unauthorized } from "@/lib/api/responses";
import { canEdit, requireDocRights } from "@/lib/permissions";
import type { DocumentEditorSummary } from "@/lib/documents/documents";
import { ROLE_RANK } from "@/lib/groups/types";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/documents/[id]/grants

  GET   -> 200 DocumentEditorSummary[]  every member of the document's group
                                        and whether they may edit it; owner,
                                        then admins, then members
        -> 401 { error }
        -> 404 { error }                no such document, or caller not in its group
*/

// Any member of the group may see who edits the document.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const rights = await requireDocRights(db, session.user.id, id);
  if (!rights) return notFound("Document");

  const members = await db.groupMember.findMany({
    where: { groupId: rights.groupId },
    select: {
      role: true,
      user: { select: { id: true, username: true, avatarUrl: true } },
      grants: { where: { documentId: id }, select: { documentId: true } },
    },
    orderBy: [{ joinedAt: "asc" }],
  });

  const editors: DocumentEditorSummary[] = members
    .map(({ role, user, grants }) => ({
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role,
      canEdit: canEdit({ groupId: rights.groupId, groupRole: role, hasGrant: grants.length > 0 }),
    }))
    .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);

  return NextResponse.json(editors);
}
