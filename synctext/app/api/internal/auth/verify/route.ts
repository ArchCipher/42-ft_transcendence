import { isAuthorized } from "@/lib/auth/internal";
import { checkSessionByHash, touchSession } from "@/lib/auth/session";
import { prisma as db } from "@synctext/db";

// verify a connection/session and return the user's access for a document
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    tokenHash?: unknown;
    documentName?: unknown;
  } | null;
  if (
    !body ||
    typeof body.tokenHash !== "string" ||
    typeof body.documentName !== "string"
  ) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const { tokenHash, documentName } = body;

  const session = await checkSessionByHash(tokenHash);
  if (!session) return Response.json({ valid: false }, { status: 401 });

  // 2 queries combined
  // 1. Recheck document access: owner / any collaborator (READ), owner / editor (WRITE)
  // 2. Determine the access role. VIEWER are readOnly
  const doc = await db.document.findFirst({
    where: {
      id: documentName,
      OR: [
        { ownerId: session.userId },
        { collab: { some: { userId: session.userId } } },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      collab: {
        where: { userId: session.userId },
        select: { docRole: true },
        take: 1,
      },
    },
  });
  if (!doc) return Response.json({ valid: false }, { status: 401 });

  const isOwner = doc.ownerId === session.userId;
  const collabRole = doc.collab[0]?.docRole; // undefined for owner
  const readOnly = !isOwner && collabRole === "VIEWER";

  await touchSession(session);
  return Response.json({ valid: true, userId: session.userId, readOnly });
}
