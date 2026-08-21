import { prisma as db } from "@synctext/db"
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import { NextResponse } from "next/server"

export async function GET() {
  const session = await validateSession(await getSessionToken());

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized access" },
      { status: 401 }
    );
  }

  const documents = await db.document.findMany({
    where: {
          OR: [
            {
              ownerId: session.user.id,
            },
            {
              collab: {
                some: {
                  userId: session.user.id,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          ownerId: true,
        },
        /*orderBy: {
          updatedAt: "desc",
          },*/
  })
  return NextResponse.json(documents);
}


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
