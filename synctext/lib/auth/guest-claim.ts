import "server-only";

import { prisma as db } from "@synctext/db";
import { hashGuestSessionToken } from "@synctext/shared";

export type GuestClaimResult =
  | { status: "claimed"; documentId: string }
  | { status: "none" }
  | { status: "expired" };

/**
 * Transfers the browser's one unclaimed temporary document to a verified user.
 * The conditional update is essential: copied cookies or concurrent requests
 * must never be able to reassign an already claimed document.
 */
export async function claimGuestDocumentForUser(
  guestToken: string | null,
  userId: string,
): Promise<GuestClaimResult> {
  if (!guestToken) return { status: "none" };

  return db.$transaction(async (tx) => {
    const guestSession = await tx.guestSession.findUnique({
      where: { tokenHash: hashGuestSessionToken(guestToken) },
      select: {
        id: true,
        expiresAt: true,
        document: { select: { id: true } },
      },
    });

    if (!guestSession || !guestSession.document) return { status: "none" };
    if (guestSession.expiresAt <= new Date()) return { status: "expired" };

    const transferred = await tx.document.updateMany({
      where: {
        id: guestSession.document.id,
        ownerId: null,
        guestSessionId: guestSession.id,
      },
      data: {
        ownerId: userId,
        guestSessionId: null,
      },
    });

    if (transferred.count !== 1) return { status: "none" };

    // The document has been detached before this delete, so the guest-session
    // cascade cannot delete the now-user-owned document.
    await tx.guestSession.delete({ where: { id: guestSession.id } });

    return { status: "claimed", documentId: guestSession.document.id };
  });
}
