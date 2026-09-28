import { prisma as db } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { conflict, forbidden, notFound, unauthorized } from "@/lib/api/responses";
import { canEdit, requireDocRights } from "@/lib/permissions";
import { grantEdit, revokeEdit } from "@/lib/documents/grants";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/documents/[id]/grants/[userId]

  PUT                                canEdit: make userId an editor
  DELETE                             canEdit: take userId back to viewer,
                                     yourself included
        -> 204                       also when nothing changed
        -> 401 { error }
        -> 403 { error }             in the group, but read-only on this document
        -> 404 { error }             no such document, caller or userId not in its group
        -> 409 { error }             userId is the group owner, who always edits
*/

type Params = { params: Promise<{ id: string; userId: string }> };

// PUT and DELETE differ only by the mutation they run.
async function changeGrant({ params }: Params, mutate: typeof grantEdit | typeof revokeEdit) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const { id, userId } = await params;
  const rights = await requireDocRights(db, session.user.id, id);
  if (!rights) return notFound("Document");
  if (!canEdit(rights)) return forbidden();

  const result = await mutate(db, id, rights.groupId, userId);
  if (result === "not_member") return notFound("Member");
  if (result === "owner") return conflict("The group owner always edits");

  return new NextResponse(null, { status: 204 });
}

export async function PUT(_request: Request, context: Params) {
  return changeGrant(context, grantEdit);
}

export async function DELETE(_request: Request, context: Params) {
  return changeGrant(context, revokeEdit);
}
