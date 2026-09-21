import { prisma as db } from "@synctext/db"
import { NextResponse } from "next/server"

import {
  documentEditWhere,
  documentReadWhere,
  type DocumentAccess,
  type DocumentSummary,
} from "@/lib/documents/documents"
import { getCurrentDocumentActor } from "@/lib/documents/access"

type SummaryDocument = {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  owner: {
    id: string
    username: string
  } | null
  collab: Array<{
    docRole: "EDITOR" | "VIEWER"
  }>
}

type GuestDocumentResponse = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  owner: null
  access: "GUEST"
  canRename: boolean
  canDelete: false
  guest: {
    mode: "EDITABLE" | "READ_ONLY"
    editExpiresAt: string
    expiresAt: string
  }
}

function toDocumentSummary(document: SummaryDocument, userId: string): DocumentSummary {
  if (!document.owner) throw new Error("Normal document is missing its owner")

  const access: DocumentAccess =
    document.owner.id === userId ? "OWNER" : (document.collab[0]?.docRole ?? "VIEWER")

  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    owner: document.owner,
    access,
    canRename: access === "OWNER" || access === "EDITOR",
    canDelete: access === "OWNER",
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
    owner: null,
    access: "GUEST",
    canRename: guest.mode === "EDITABLE",
    canDelete: false,
    guest: {
      mode: guest.mode,
      editExpiresAt: guest.editExpiresAt.toISOString(),
      expiresAt: guest.expiresAt.toISOString(),
    },
  }
}

const summarySelect = (userId: string) =>
  ({
    id: true,
    title: true,
    createdAt: true,
    updatedAt: true,
    owner: {
      select: {
        id: true,
        username: true,
      },
    },
    collab: {
      where: { userId },
      select: { docRole: true },
    },
  }) as const

const guestSelect = {
  id: true,
  title: true,
  createdAt: true,
  updatedAt: true,
} as const

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function notFoundResponse() {
  // Do not reveal whether an ID exists outside the current user/guest scope.
  return NextResponse.json({ error: "Document not found" }, { status: 404 })
}

// Get one document that belongs to the signed-in actor or this browser's guest session.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentDocumentActor()
  if (!actor) return unauthorized()

  const { id } = await params
  if (actor.kind === "guest") {
    const document = await db.document.findFirst({
      where: { id, guestSessionId: actor.guestSessionId },
      select: guestSelect,
    })
    if (!document) return notFoundResponse()
    return NextResponse.json(toGuestDocumentResponse(document, actor))
  }

  const document = await db.document.findFirst({
    where: { id, ...documentReadWhere(actor.userId) },
    select: summarySelect(actor.userId),
  })
  if (!document || !document.owner) return notFoundResponse()

  return NextResponse.json(toDocumentSummary(document, actor.userId))
}

// Rename a document when the current actor is a user owner/editor, or the
// guest document is still inside its first thirty minutes.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentDocumentActor()
  if (!actor) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("title" in body) ||
    typeof body.title !== "string"
  ) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const title = body.title.trim()
  if (title.length === 0 || title.length > 120) {
    return NextResponse.json(
      { error: "Title must be between 1 and 120 characters" },
      { status: 400 },
    )
  }

  const { id } = await params
  if (actor.kind === "guest") {
    const guestWhere = { id, guestSessionId: actor.guestSessionId }
    const existing = await db.document.findFirst({ where: guestWhere, select: { id: true } })
    if (!existing) return notFoundResponse()
    if (actor.mode === "READ_ONLY") {
      return NextResponse.json(
        { error: "Temporary documents are read-only after 30 minutes" },
        { status: 403 },
      )
    }

    await db.document.update({ where: { id: existing.id }, data: { title } })
    const document = await db.document.findUnique({ where: { id: existing.id }, select: guestSelect })
    if (!document) return notFoundResponse()
    return NextResponse.json(toGuestDocumentResponse(document, actor))
  }

  const result = await db.document.updateMany({
    where: { id, ...documentEditWhere(actor.userId) },
    data: { title },
  })
  if (result.count === 0) return notFoundResponse()

  const document = await db.document.findUnique({
    where: { id },
    select: summarySelect(actor.userId),
  })
  if (!document || !document.owner) return notFoundResponse()

  return NextResponse.json(toDocumentSummary(document, actor.userId))
}

// Permanently delete only normal documents owned by the signed-in user.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentDocumentActor()
  if (!actor) return unauthorized()
  if (actor.kind === "guest") return notFoundResponse()

  const { id } = await params
  const result = await db.document.deleteMany({
    where: { id, ownerId: actor.userId },
  })
  if (result.count === 0) return notFoundResponse()

  return new NextResponse(null, { status: 204 })
}
