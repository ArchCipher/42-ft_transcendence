import { prisma as db } from "@synctext/db";
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import {
  summarySelect,
  toDocumentSummary,
} from "@/lib/documents/documents";
import { canEdit, requireDocRights, resolveRights } from "@/lib/permissions";
import { badRequest, forbidden, notFound, readJson, unauthorized } from "@/lib/api/responses";
import { NextResponse } from "next/server";

const documentNotFound = () => notFound("Document");

/*
API Response contracts: /api/documents/[id]

  GET                                any member of the document's group
        -> 200 DocumentSummary
        -> 401 { error }
        -> 404 { error }             no such document, or caller not in its group

  PATCH { title }                    canEdit: the group's owner, or a grant
        -> 200 DocumentSummary
        -> 400 { error }             title empty or over 120 chars
        -> 401 { error }
        -> 403 { error }             in the group, but read-only on this document
        -> 404 { error }

  DELETE                             canEdit: an editor may also delete
        -> 204
        -> 401 { error }
        -> 403 { error }
        -> 404 { error }

  403 and 404 differ on purpose: 403 says the document exists and you may not,
  404 is for anyone outside the group, who must not learn that it exists.
*/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const document = await db.document.findUnique({
    where: { id },
    select: summarySelect(session.user.id),
  });
  if (!document) return documentNotFound();

  // Not a member of the group: the document does not exist for this user.
  const rights = resolveRights(document);
  if (!rights) return documentNotFound();

  return NextResponse.json(toDocumentSummary(document, rights));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  const body = await readJson(request);
  if (
    typeof body !== "object" ||
    body === null ||
    !("title" in body) ||
    typeof body.title !== "string"
  ) {
    return badRequest("Title is required");
  }

  const title = body.title.trim();
  if (title.length === 0 || title.length > 120) {
    return badRequest("Title must be between 1 and 120 characters");
  }

  const { id } = await params;
  const document = await db.document.findUnique({
    where: { id },
    select: summarySelect(session.user.id),
  });
  if (!document) return documentNotFound();

  const rights = resolveRights(document);
  if (!rights) return documentNotFound();
  if (!canEdit(rights)) return forbidden();

  const updated = await db.document.update({
    where: { id },
    data: { title },
    select: summarySelect(session.user.id),
  });

  return NextResponse.json(toDocumentSummary(updated, rights));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) return unauthorized();

  // Only the rights are needed here, so this fetches less than summarySelect.
  const { id } = await params;
  const rights = await requireDocRights(db, session.user.id, id);
  if (!rights) return documentNotFound();
  if (!canEdit(rights)) return forbidden();

  // Cascade: snapshots and grants go with the document.
  await db.document.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
