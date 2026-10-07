import { registerSchema } from "@/lib/auth/validation";
import {
  clientIp,
  ipLimiter,
  accountLimiter,
  ipKey,
  accountKey,
  registerLimiter,
} from "@/lib/auth/rate-limit";
import { hashPassword } from "@/lib/auth/password";
import { prisma as db, Prisma } from "@synctext/db";
import {
  generateVerificationToken,
  hashVerificationToken,
  verificationExpiresAt,
} from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/auth/email";
import { parseRequest } from "@/lib/auth/parse-request";
import { createUserWithPrivateSpace } from "@/lib/auth/create-user";

/*
Register Handler: validation -> rate limit -> create user -> verification email
	No session issued here - user authenticates AFTER verifying email ownership

API Response contracts: POST /api/auth/register

	Request:  { email, username, password }
	Response:
		201 → { ok: true }
		400 → { error, fields: { email?, username?, password? } }
		409 → { error: "Email or username already exists" }
		415 → { error: "Content-Type must be application/json" }
		429 → { error: "Too many attempts" }
		   or { error: "Too many accounts from this network" }
		500 → { error } (unhandled server error)
*/

export async function POST(request: Request) {
  const result = await parseRequest(request, registerSchema);
  if (result.error) return result.error;

  const input = result.data;

  const ip = clientIp(request);

  // sign-up quota
  if ((await registerLimiter.blockedRemaining(ipKey(ip))) > 0)
    return Response.json(
      { error: "Too many accounts from this network" },
      { status: 429 },
    );

  // rate limit by IP
  if ((await ipLimiter.blockedRemaining(ipKey(ip))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // rate limit by account
  if ((await accountLimiter.blockedRemaining(accountKey(input.email))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  /*
  Hash password (to store in DB), create user and email verification token.

  Email verification: one-time opaque token (OWASP: >= 32 chars, secure RNG,
  single use, time limited). Store only hash, raw token is sent to email.
  */
  const passwordHash = await hashPassword(input.password);
  const token = generateVerificationToken();
  try {
    await db.$transaction(async (tx) => {
      const userId = await createUserWithPrivateSpace(tx, {
        email: input.email,
        username: input.username,
        passwordHash,
      });
      await tx.emailVerificationToken.create({
        data: {
          userId,
          tokenHash: hashVerificationToken(token),
          expiresAt: verificationExpiresAt(),
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return Response.json(
        { error: "Email or username already exists" },
        { status: 409 },
      );
    throw error;
  }

  try {
    await sendVerificationEmail(input.email, token);
  } catch (error) {
    console.error("[email] verification send fail error:", error);
  }

  // sweep: POST /api/internal/auth/cleanup

  // count successful account creation
  await registerLimiter.recordFailure(ipKey(ip));

  return Response.json({ ok: true }, { status: 201 });
}
