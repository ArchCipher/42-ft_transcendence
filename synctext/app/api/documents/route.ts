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

// List documents the current user owns or can access through a share.

export async function GET() {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const documents = await db.document.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        {
          collab: {
            some: { userId: session.user.id },
          },
        },
      ],
    },
    select: {
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
        where: { userId: session.user.id },
        select: { docRole: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const summaries: DocumentSummary[] = documents.map((document) => {
    const access: DocumentAccess =
      document.owner.id === session.user.id
        ? "OWNER"
        : (document.collab[0]?.docRole ?? "VIEWER");

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
  });

  return NextResponse.json(summaries);
}

// Create a document owned by the current user.

export async function POST() {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }
  const document = await db.document.create({
    data: {
      title: "Untitled Document",
      ownerId: session.user.id,
    },
    select: {
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
    },
  });

  const summary: DocumentSummary = {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    owner: document.owner,
    access: "OWNER",
    canRename: true,
    canDelete: true,
  };

  return NextResponse.json(summary, { status: 201 });
}
