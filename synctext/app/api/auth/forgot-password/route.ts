import { emailRequestSchema } from "@/lib/auth/validation";
import {
  clientIp,
  ipLimiter,
  ipKey,
  emailLimiter,
  emailKey,
} from "@/lib/auth/rate-limit";
import { prisma as db } from "@synctext/db";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
} from "@/lib/auth/password-reset";
import { parseRequest } from "@/lib/auth/parse-request";

/*
API Response contracts: POST /api/auth/forgot-password

	Request:  { email }
	Response:
	200 → { ok: "Check your email to reset password" }
	400 → { error, fields: { email? } }
	415 → { error: "Content-Type must be application/json" }
	429 → { error: "Too many attempts" }
	500 → { error } (unhandled server error)
*/

export async function POST(request: Request) {
  const result = await parseRequest(request, emailRequestSchema);
  if (result.error) return result.error;

  const input = result.data;

  const ip = clientIp(request);

  // rate limit by IP
  if ((await ipLimiter.blockedRemaining(ipKey(ip))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // rate limit by email
  if (!(await emailLimiter.tryAcquire(emailKey(input.email))))
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  const user = await db.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      passwordHash: true,
    },
  });
  /*
  Nothing to send in any of these cases, answer identically so the
  response never reveals which case it was: unknown address,
  no password(OAuth only)
  */
  if (!user) await ipLimiter.recordFailure(ipKey(ip));
  if (!user || user.passwordHash === null)
    return Response.json(
      { ok: "Check your email to reset password" },
      { status: 200 },
    );

  // create password reset token, delete previous tokens
  const token = generatePasswordResetToken();
  await db.$transaction([
    db.passwordResetToken.deleteMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    }), // delete previous tokens if any
    db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashPasswordResetToken(token),
        expiresAt: passwordResetExpiresAt(),
      },
    }), // create password reset token
  ]);

  // send email for password reset
  try {
    await sendPasswordResetEmail(input.email, token);
  } catch (error) {
    console.error("[email] forgot password send fail error:", error);
  }

  return Response.json(
    { ok: "Check your email to reset password" },
    { status: 200 },
  );
}
