import { prisma as db } from "@synctext/db"
import { NextResponse } from "next/server"

import {
  summarySelect,
  toDocumentSummary,
} from "@/lib/documents/documents";
import { getCurrentDocumentActor } from "@/lib/documents/access";
import { canEdit, requireDocRights, resolveRights } from "@/lib/permissions";
import { badRequest, forbidden, notFound, readJson, unauthorized } from "@/lib/api/responses";

const documentNotFound = () => notFound("Document");

/*
API Response contracts: /api/documents/[id]

  GET                                any member of the document's group, or the
                                     guest session this document belongs to
        -> 200 DocumentSummary | GuestDocumentResponse
        -> 401 { error }
        -> 404 { error }             no such document, or caller not in its group

  PATCH { title }                    canEdit: the group's owner, or a grant.
                                     A guest may rename until its edit deadline.
        -> 200 DocumentSummary | GuestDocumentResponse
        -> 400 { error }             title empty or over 120 chars
        -> 401 { error }
        -> 403 { error }             in the group, but read-only on this document
        -> 404 { error }

  DELETE                             canEdit: an editor may also delete.
                                     Never a guest: expiry deletes its document.
        -> 204
        -> 401 { error }
        -> 403 { error }
        -> 404 { error }

  403 and 404 differ on purpose: 403 says the document exists and you may not,
  404 is for anyone outside the group, who must not learn that it exists.
*/

// A guest document has neither group nor creator, so no Rights can be resolved
// for it: what it may do comes from its session's deadline instead.
type GuestDocumentResponse = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  groupId: null
  createdBy: null
  canRename: boolean
  canDelete: false
  guest: {
    mode: "EDITABLE" | "READ_ONLY"
    editExpiresAt: string
    expiresAt: string
  }
}

function toGuestDocumentResponse(
  document: { id: string; title: string; createdAt: Date; updatedAt: Date },
  guest: {
    mode: "EDITABLE" | "READ_ONLY"
    editExpiresAt: Date
    expiresAt: Date
  },
): GuestDocumentResponse {
  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    groupId: null,
    createdBy: null,
    canRename: guest.mode === "EDITABLE",
    canDelete: false,
    guest: {
      mode: guest.mode,
      editExpiresAt: guest.editExpiresAt.toISOString(),
      expiresAt: guest.expiresAt.toISOString(),
    },
  }
}

const guestSelect = {
  id: true,
  title: true,
  createdAt: true,
  updatedAt: true,
} as const

// Get one document that belongs to the signed-in actor or this browser's guest session.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentDocumentActor();
  if (!actor) return unauthorized();

  const { id } = await params;
  if (actor.kind === "guest") {
    const document = await db.document.findFirst({
      where: { id, guestSessionId: actor.guestSessionId },
      select: guestSelect,
    });
    if (!document) return documentNotFound();
    return NextResponse.json(toGuestDocumentResponse(document, actor));
  }

  const document = await db.document.findUnique({
    where: { id },
    select: summarySelect(actor.userId),
  });
  if (!document) return documentNotFound();

  // Not a member of the group: the document does not exist for this user.
  const rights = resolveRights(document);
  if (!rights) return documentNotFound();

  return NextResponse.json(toDocumentSummary(document, rights));
}

// Rename a document when the caller may edit it, or when the guest document is
// still inside its first thirty minutes.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentDocumentActor();
  if (!actor) return unauthorized();

  const body = await readJson(request);
  if (
    typeof body !== "object" ||
    body === null ||
    !("title" in body) ||
    typeof body.title !== "string"
  ) {
    return badRequest("Title is required");
  }

  const title = body.title.trim()
  if (title.length === 0 || title.length > 120) {
    return badRequest("Title must be between 1 and 120 characters");
  }

  const { id } = await params;
  if (actor.kind === "guest") {
    const existing = await db.document.findFirst({
      where: { id, guestSessionId: actor.guestSessionId },
      select: { id: true },
    });
    if (!existing) return documentNotFound();
    if (actor.mode === "READ_ONLY") {
      return NextResponse.json(
        { error: "Temporary documents are read-only after 30 minutes" },
        { status: 403 },
      );
    }

    const document = await db.document.update({
      where: { id: existing.id },
      data: { title },
      select: guestSelect,
    });
    return NextResponse.json(toGuestDocumentResponse(document, actor));
  }

  const document = await db.document.findUnique({
    where: { id },
    select: summarySelect(actor.userId),
  });
  if (!document) return documentNotFound();

  const rights = resolveRights(document);
  if (!rights) return documentNotFound();
  if (!canEdit(rights)) return forbidden();

  const updated = await db.document.update({
    where: { id },
    data: { title },
    select: summarySelect(actor.userId),
  });

  return NextResponse.json(toDocumentSummary(updated, rights));
}

// Permanently delete a document the caller may edit. Never a guest document:
// its session's expiry deletes it by cascade.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentDocumentActor();
  if (!actor) return unauthorized();
  if (actor.kind === "guest") return documentNotFound();

  // Only the rights are needed here, so this fetches less than summarySelect.
  const { id } = await params;
  const rights = await requireDocRights(db, actor.userId, id);
  if (!rights) return documentNotFound();
  if (!canEdit(rights)) return forbidden();

  // Cascade: snapshots and grants go with the document.
  await db.document.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
