import { isAuthorized } from "@/lib/auth/internal";
import { parseRequest } from "@/lib/auth/parse-request";
import { checkSessionByHash } from "@/lib/auth/session";
import { sessionVerifySchema } from "@/lib/auth/validation";
import { canEdit, requireDocRights } from "@/lib/permissions";
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

  // One query for the caller's group role and their grant on this document.
  // No such document and not a member are the same answer here.
  const rights = await requireDocRights(db, session.userId, documentName);
  if (!rights) return Response.json({ valid: false }, { status: 401 });

  return Response.json({
    valid: true,
    userId: session.userId,
    readOnly: !canEdit(rights),
  });
}
