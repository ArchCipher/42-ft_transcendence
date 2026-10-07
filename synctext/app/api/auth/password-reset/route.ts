import { passwordResetSchema } from "@/lib/auth/validation";
import {
  clientIp,
  ipLimiter,
  accountLimiter,
  ipKey,
  accountKey,
} from "@/lib/auth/rate-limit";
import { prisma as db } from "@synctext/db";
import { hashPasswordResetToken } from "@/lib/auth/password-reset";
import { hashPassword } from "@/lib/auth/password";
import { isPasswordStrong } from "@/lib/auth/password-strength";
import { parseRequest } from "@/lib/auth/parse-request";

/*
API Response contracts: POST /api/auth/password-reset

	Request:  { password }
	Response:
		200 → { ok: true }
		400 → { error, fields: { token?, password? } }
		   or { error: "Invalid or expired link" }
		   or { error: "Password too weak" }
		415 → { error: "Content-Type must be application/json" }
		429 → { error: "Too many attempts" }
		500 → { error } (unhandled server error)
*/

export async function POST(request: Request) {
  const result = await parseRequest(request, passwordResetSchema);
  if (result.error) return result.error;

  const input = result.data;

  const ip = clientIp(request);

  // rate limit by IP
  if ((await ipLimiter.blockedRemaining(ipKey(ip))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // validate token and fetch user
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(input.token) },
  });
  if (!record || record.usedAt !== null || record.expiresAt < new Date())
    return Response.json({ error: "Invalid or expired link" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: record.userId } });
  if (!user)
    return Response.json({ error: "Invalid or expired link" }, { status: 400 });

  // rate limit by account
  if ((await accountLimiter.blockedRemaining(accountKey(user.email))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  if (!isPasswordStrong(input.password, [user.username, user.email]).ok)
    return Response.json({ error: "Password too weak" }, { status: 400 });

  const passwordHash = await hashPassword(input.password);
  const done = await db.$transaction(async (tx) => {
    // revoke password-reset token
    const claim = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    }); // update token
    if (claim.count === 0) return false;

    // record new password, revoke all sessions
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }); // update user row
    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }); // revoke all sessions
    return true;
  });
  if (!done)
    return Response.json({ error: "Invalid or expired link" }, { status: 400 });

  // success: reset any accumulated failures for ip/account
  await ipLimiter.clear(ipKey(ip));
  await accountLimiter.clear(accountKey(user.email));

  return Response.json({ ok: true }, { status: 200 });
}
