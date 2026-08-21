import { forgotPasswordSchema } from "@/lib/auth/validation";
import {
  clientIp,
  ipLimiter,
  accountLimiter,
  ipKey,
  accountKey,
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
  const result = await parseRequest(request, forgotPasswordSchema);
  if (result.error) return result.error;

  const input = result.data;

  const ip = clientIp(request);

  // rate limit by IP
  if ((await ipLimiter.blockedRemaining(ipKey(ip))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // rate limit by account
  if ((await accountLimiter.blockedRemaining(accountKey(input.email))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // if user doesn't exist still say check email -> anti enumeration
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await ipLimiter.recordFailure(ipKey(ip));
    return Response.json(
      { ok: "Check your email to reset password" },
      { status: 200 },
    );
  }

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

  // TODO: resend email endpoint for email send failure

  return Response.json(
    { ok: "Check your email to reset password" },
    { status: 200 },
  );
}
