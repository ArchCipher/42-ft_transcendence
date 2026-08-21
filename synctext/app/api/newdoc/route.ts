import { prisma as db } from "@synctext/db";
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import { NextResponse } from "next/server";



export async function POST() {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  const document = await db.document.create({
    data: {
      title: "Untitled Document",
      ownerId: session.user.id,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
