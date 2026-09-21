import { isAuthorized } from "@/lib/auth/internal";
import { parseRequest } from "@/lib/auth/parse-request";
import { checkSessionByHash } from "@/lib/auth/session";
import { sessionVerifySchema } from "@/lib/auth/validation";
import { prisma as db } from "@synctext/db";

// verify a connection/session and return the user's access for a document
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseRequest(request, sessionVerifySchema);
  if (result.error) return result.error;

  const { tokenHash, documentName } = result.data;

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

  return Response.json({ valid: true, userId: session.userId, readOnly });
}
