import "server-only";

import { prisma as db } from "@synctext/db";
import { hashSessionToken } from "@synctext/shared";
import {
  generateSessionToken,
  MAX_SESSIONS,
  sessionExpiresAt,
  setSessionCookie,
} from "./session";
import { clearGuestSessionCookie, getGuestSessionToken } from "./guest-session";
import { claimGuestDocumentForUser } from "./guest-claim";

export async function createSessionForUser(
  userId: string,
  meta: { ip: string | null; userAgent: string | null },
): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  await db.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: userId },
      data: { updatedAt: new Date() },
    });
    await tx.session.create({
      data: {
        tokenHash,
        userId,
        expiresAt: sessionExpiresAt(),
        lastUsedAt: new Date(),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    }); // create session: store hash, not the raw token
    const stale = await tx.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      skip: MAX_SESSIONS,
    }); // get previous sessions, skip MAX_SESSIONS
    if (stale.length)
      await tx.session.updateMany({
        where: { id: { in: stale.map((s) => s.id) } },
        data: { revokedAt: new Date() },
      }); // keep MAX_SESSIONS and revoke other old sessions
  });

  await setSessionCookie(token);
  const guestToken = await getGuestSessionToken();
  let guestClaim: Awaited<ReturnType<typeof claimGuestDocumentForUser>>;
  try {
    guestClaim = await claimGuestDocumentForUser(guestToken, userId);
    if (guestToken) await clearGuestSessionCookie();
  } catch (error) {
    console.error("[session] guest claim failed", error);
    return "/dashboard";
  }
  if (guestClaim.status === "claimed")
    return `/doc/${encodeURIComponent(guestClaim.documentId)}`;
  return "/dashboard";
}
