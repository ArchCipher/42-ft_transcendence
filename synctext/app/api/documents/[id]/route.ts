import { prisma as db } from "@synctext/db";
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import type {
  DocumentAccess,
  DocumentSummary,
} from "@/lib/documents/documents";
import { NextResponse } from "next/server";

type SummaryDocument = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    username: string;
  };
  collab: Array<{
    docRole: "EDITOR" | "VIEWER";
  }>;
};

function toDocumentSummary(document: SummaryDocument,userId: string,): DocumentSummary {
  const access: DocumentAccess =
    document.owner.id === userId ? "OWNER": (document.collab[0]?.docRole ?? "VIEWER");

  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    owner: document.owner,
    access,
    canRename: access === "OWNER" || access === "EDITOR",
    canDelete: access === "OWNER",
  };
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
  }) as const;

// Get one document the current user owns or can access through a share.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const document = await db.document.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        {
          collab: {
            some: { userId: session.user.id },
          },
        },
      ],
    },
    select: summarySelect(session.user.id),
  });

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(toDocumentSummary(document, session.user.id));
}

// Rename a document when the current user is its owner or an editor.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("title" in body) ||
    typeof body.title !== "string"
  ) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 },
    );
  }

  const title = body.title.trim();
  if (title.length === 0 || title.length > 120) {
    return NextResponse.json(
      { error: "Title must be between 1 and 120 characters" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await db.document.updateMany({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        {
          collab: {
            some: {
              userId: session.user.id,
              docRole: "EDITOR",
            },
          },
        },
      ],
    },
    data: { title },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }

  const document = await db.document.findUnique({
    where: { id },
    select: summarySelect(session.user.id),
  });

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(toDocumentSummary(document, session.user.id));
}

// Permanently delete a document owned by the current user.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const result = await db.document.deleteMany({
    where: {
      id,
      ownerId: session.user.id,
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
