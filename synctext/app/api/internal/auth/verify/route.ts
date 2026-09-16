import { isAuthorized } from "@/lib/auth/internal";
import { parseRequest } from "@/lib/auth/parse-request";
import { checkSessionByHash } from "@/lib/auth/session";
import { sessionVerifySchema } from "@/lib/auth/validation";
import { canEdit, documentAccessSelect, resolveRights } from "@/lib/permissions";
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

  // One query: the document, the caller's group role and their grant on it.
  const document = await db.document.findUnique({
    where: { id: documentName },
    select: documentAccessSelect(session.userId),
  });
  if (!document) return Response.json({ valid: false }, { status: 401 });

  // Not a member of the group means no access at all, same as no document.
  const rights = resolveRights(document);
  if (!rights) return Response.json({ valid: false }, { status: 401 });

  return Response.json({
    valid: true,
    userId: session.userId,
    readOnly: !canEdit(rights),
  });
}
