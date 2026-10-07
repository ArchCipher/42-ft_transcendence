import { emailRequestSchema } from "@/lib/auth/validation";
import {
  clientIp,
  ipLimiter,
  ipKey,
  emailKey,
  emailLimiter,
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

  // rate limit by email
  if (!(await emailLimiter.tryAcquire(emailKey(input.email))))
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  const user = await db.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      emailVerifiedAt: true,
      passwordHash: true,
    },
  });
  /*
  Nothing to send in any of these cases, answer identically so the
  response never reveals which case it was: unknown address, already verified
  */
  if (!user) await ipLimiter.recordFailure(ipKey(ip));
  if (!user || user.emailVerifiedAt !== null)
    return Response.json(
      { ok: "Check your email to verify your account" },
      { status: 200 },
    );

  // issue a fresh link, replacing any expired or already-used one
  const token = generateVerificationToken();
  await db.$transaction([
    db.emailVerificationToken.deleteMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    }), // delete previous tokens if any
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

  return Response.json(
    { ok: "Check your email to verify your account" },
    { status: 200 },
  );
}
