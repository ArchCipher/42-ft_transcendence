import { prisma as db } from "@synctext/db";
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import { documentReadWhere } from "@/lib/permissions";
import { NextResponse } from "next/server";

// load one snapshot for a document the current user can read
export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; snapshotId: string }> },
) {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id, snapshotId } = await params;
  const document = await db.document.findFirst({
    where: { id, ...documentReadWhere(session.user.id) },
    select: { id: true },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }

  const snapshot = await db.documentSnapshot.findFirst({
    where: {
      id: snapshotId,
      documentId: id,
    },
    select: { ystate: true },
  });

  if (!snapshot) {
    return NextResponse.json(
      { error: "Snapshot not found" },
      { status: 404 },
    );
  }

  return new Response(Buffer.from(snapshot.ystate), {
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "private, no-store",
    },
  });
}
