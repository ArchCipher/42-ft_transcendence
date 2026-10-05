import { emailRequestSchema } from "@/lib/auth/validation";
import {
  clientIp,
  ipLimiter,
  accountLimiter,
  ipKey,
  accountKey,
} from "@/lib/auth/rate-limit";
import { prisma as db } from "@synctext/db";
import { sendVerificationEmail } from "@/lib/auth/email";
import {
  generateVerificationToken,
  hashVerificationToken,
  verificationExpiresAt,
} from "@/lib/auth/verification";
import { parseRequest } from "@/lib/auth/parse-request";

/*
API Response contracts: POST /api/auth/resend-verification

	Request:  { email }
	Response:
	200 → { ok: "Check your email to verify your account" }
	400 → { error, fields: { email? } }
	415 → { error: "Content-Type must be application/json" }
	429 → { error: "Too many attempts" }
	500 → { error } (unhandled server error)

Registration emails get dropped by greylisting and spam filters often enough
that a dead link leaves the address unusable: login rejects emailVerifiedAt ===
null and a second signup hits the unique constraint. This re-issues a link
instead. Same shape as forgot-password, including its anti-enumeration
discipline — every accepted request returns the same 200 body.
*/

export async function POST(request: Request) {
  const result = await parseRequest(request, emailRequestSchema);
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
      { ok: "Check your email to verify your account" },
      { status: 200 },
    );
  }

  /*
  Already verified: nothing to send. Reported as success so the response never
  reveals which case it was.

  A live token is NOT a reason to skip.
  */
  if (user.emailVerifiedAt !== null)
    return Response.json(
      { ok: "Check your email to verify your account" },
      { status: 200 },
    );

  // issue a fresh link, replacing any expired or already-used one
  const token = generateVerificationToken();
  await db.$transaction([
    db.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    }),
    db.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashVerificationToken(token),
        expiresAt: verificationExpiresAt(),
      },
    }),
  ]);

  // send verification email
  try {
    await sendVerificationEmail(input.email, token);
  } catch (error) {
    console.error("[email] resend verification send fail error:", error);
  }
  // Count real send against account budget. Per-IP doesn't stop a caller who
  // rotates IPs
  await accountLimiter.recordFailure(accountKey(input.email));

  return Response.json(
    { ok: "Check your email to verify your account" },
    { status: 200 },
  );
}
