import { prisma as db } from "@synctext/db";
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import {
  summarySelect,
  toDocumentSummary,
  type DocumentSummary,
} from "@/lib/documents/documents";
import { documentReadWhere, resolveRights } from "@/lib/permissions";
import { badRequest, notFound, readJson, unauthorized } from "@/lib/api/responses";
import { NextResponse } from "next/server";

/*
API Response contracts: /api/documents

  GET                                every document of every group the caller
                                     is in, newest first
        -> 200 DocumentSummary[]
        -> 401 { error }

  POST  { groupId? }                 defaults to the caller's private space
        -> 201 DocumentSummary
        -> 400 { error }             groupId present but not a string
        -> 401 { error }
        -> 404 { error }             caller is not a member of that group
*/

export async function GET() {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const documents = await db.document.findMany({
    where: documentReadWhere(session.user.id),
    select: summarySelect(session.user.id),
    orderBy: { updatedAt: "desc" },
  });

  // documentReadWhere already filtered on membership, so resolveRights never
  // returns null here; flatMap keeps that from needing an assertion.
  const summaries: DocumentSummary[] = documents.flatMap((document) => {
    const rights = resolveRights(document);
    return rights ? [toDocumentSummary(document, rights)] : [];
  });

  return NextResponse.json(summaries);
}

// The creator gets a grant on what they create: without it a plain member
// would be a viewer of the document they just made.
export async function POST(request: Request) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const body = await readJson(request);
  let requestedGroupId: string | undefined;
  if (typeof body === "object" && body !== null && "groupId" in body) {
    if (typeof body.groupId !== "string") return badRequest("groupId must be a string");
    requestedGroupId = body.groupId;
  }

  const userId = session.user.id;

  const created = await db.$transaction(async (tx) => {
    const membership = requestedGroupId
      ? await tx.groupMember.findUnique({
          where: { groupId_userId: { groupId: requestedGroupId, userId } },
          select: { id: true, groupId: true },
        })
      : await tx.groupMember.findFirst({
          where: { userId, group: { isPrivateSpace: true } },
          // Nothing in the database forbids a second private space, so pick
          // the oldest rather than an arbitrary one: documents must not
          // scatter between two of them.
          orderBy: { group: { createdAt: "asc" } },
          select: { id: true, groupId: true },
        });

    if (!membership) return null;

    const untitledDocs = await tx.document.findMany({
      where: {
        groupId: membership.groupId,
        title: { startsWith: "Untitled Document " },
      },
      select: { title: true},
    });

    let highestNum = 0;

    for (const doc of untitledDocs)
    {
      const num = Number(doc.title.replace("Untitled Document ", ""));
      if (num > highestNum)
          highestNum = num;
    }

    const title = `Untitled Document ${highestNum + 1}`;

    return tx.document.create({
      data: {
        title,
        groupId: membership.groupId,
        createdById: userId,
        grants: { create: { membershipId: membership.id } },
      },
      select: summarySelect(userId),
    });
  });

  // Not a member of that group, so for this user it does not exist.
  if (!created) return notFound("Group");

  const rights = resolveRights(created);
  if (!rights) return notFound("Group");

  return NextResponse.json(toDocumentSummary(created, rights), { status: 201 });
}
