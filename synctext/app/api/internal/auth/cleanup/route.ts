import { prisma as db } from "@synctext/db";
import { isAuthorized } from "@/lib/auth/internal";
import { deleteUser } from "@/lib/groups/ownership";

/*
Dead-row cleanup for the auth tables. Called only by the internal scheduled
cleanup container, alongside the guest-session sweep. Every predicate below is
"this row can no longer authenticate anyone", so running it early or late is
harmless and the endpoint is idempotent.

Retention is deliberate: rows are only removed after they have been dead for a
while, which keeps a rolling window for debugging an auth incident.
*/

const SESSION_RETENTION_MS = 24 * 60 * 60 * 1000; // 1 day

const UNVERIFIED_BATCH = 100;

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sessionCutoff = new Date(now.getTime() - SESSION_RETENTION_MS);

  // Verification and password reset links are removed once expired or used
  const verificationTokens = await db.emailVerificationToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
    },
  });

  const passwordResetTokens = await db.passwordResetToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
    },
  });

  // Dead user sessions
  const sessions = await db.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: sessionCutoff } },
        { revokedAt: { lt: sessionCutoff } },
      ],
    },
  });

  // Accounts whose last verification link is gone.
  const unverified = await db.user.findMany({
    where: {
      emailVerifiedAt: null,
      emailVerificationTokens: { none: { expiresAt: { gt: now } } },
    },
    select: { id: true },
    take: UNVERIFIED_BATCH,
  });

  let unverifiedUsers = 0;
  let failed = 0;

  for (const { id } of unverified) {
    try {
      await deleteUser(db, id);
      unverifiedUsers += 1;
    } catch (error) {
      // One stuck account must not stop the sweep; the next round retries it.
      failed += 1;
      console.error("[cleanup] unverified user delete failed:", error);
    }
  }

  return Response.json({
    ok: true,
    deleted: {
      verificationTokens: verificationTokens.count,
      passwordResetTokens: passwordResetTokens.count,
      sessions: sessions.count,
      unverifiedUsers,
    },
    failed,
  });
}
