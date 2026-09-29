import { isAuthorized } from "@/lib/auth/internal";
import { checkSessionByHash } from "@/lib/auth/session";
import { canEdit, requireDocRights } from "@/lib/permissions";
import { internalVerifySchema } from "@/lib/auth/validation";
import { prisma as db } from "@synctext/db";
import { SESSION_LAST_USED_UPDATE_THRESHOLD } from "@synctext/shared";

// Verify a registered or guest connection and return its access for a document.
// The raw cookie token never reaches this route: the collaboration service sends
// its SHA-256 hash over the authenticated internal-service channel.
export async function POST(request: Request) {
  if (!isAuthorized(request))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = internalVerifySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "Bad request" }, { status: 400 });

  const { documentName, guestTokenHash } = parsed.data;

  if (guestTokenHash) {
    const guestSession = await db.guestSession.findUnique({
      where: { tokenHash: guestTokenHash },
      select: {
        id: true,
        editExpiresAt: true,
        expiresAt: true,
        document: {
          select: { id: true, guestSessionId: true },
        },
      },
    });
    const now = new Date();

    // A guest token is valid only for its single linked document and until the
    // hard 35-minute expiry. Do not disclose whether another document exists.
    if (
      !guestSession ||
      guestSession.expiresAt <= now ||
      guestSession.document?.id !== documentName ||
      guestSession.document.guestSessionId !== guestSession.id
    ) {
      return Response.json(
        { valid: false, reason: "invalid guest access" },
        { status: 401 },
      );
    }

    return Response.json({
      valid: true,
      actor: { kind: "guest", guestSessionId: guestSession.id },
      readOnly: guestSession.editExpiresAt <= now,
      editExpiresAt: guestSession.editExpiresAt.toISOString(),
      expiresAt: guestSession.expiresAt.toISOString(),
    });
  }

  const tokenHash = parsed.data.tokenHash!;

  const session = await checkSessionByHash(tokenHash);
  if (!session) return Response.json({ valid: false }, { status: 401 });

  // One query for the caller's group role and their grant on this document.
  // No such document and not a member are the same answer here.
  const rights = await requireDocRights(db, session.userId, documentName);
  if (!rights) return Response.json({ valid: false }, { status: 401 });

  // refresh lastUsedAt to avoid self-logout
  if (
    !session.lastUsedAt ||
    Date.now() - session.lastUsedAt.getTime() >
      SESSION_LAST_USED_UPDATE_THRESHOLD
  ) {
    await db.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return Response.json({
    valid: true,
    actor: { kind: "user", userId: session.userId },
    // Retain userId for consumers that have not yet moved to actor.kind.
    userId: session.userId,
    readOnly: !canEdit(rights),
  });
}
