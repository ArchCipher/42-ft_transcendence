import { prisma as db } from "@synctext/db";
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import { documentReadWhere } from "@/lib/permissions";
import { NextResponse } from "next/server";

// list the latest snapshots for a document the current user can read
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
    where: { id, ...documentReadWhere(session.user.id) },
    select: {
      snapshots: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    document.snapshots.map((snapshot) => ({
      id: snapshot.id,
      createdAt: snapshot.createdAt.toISOString(),
    })),
  );
}
