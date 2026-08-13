import { registerSchema, validationError } from "@/lib/auth/validation";
import { clientIp, ipLimiter, accountLimiter, ipKey, accountKey } from "@/lib/auth/rate-limit";
import { hashPassword } from "@/lib/auth/password";
import { Prisma } from "@prisma/client";
import { generateVerificationToken, hashVerificationToken, verificationExpiresAt } from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/auth/email";
import { db } from "@/lib/db"; // TODO: add prisma here!!!

// Register Handler: validation -> rate limit -> create user -> verification email
// No session issued here - user authenticates AFTER verifying email ownership

export async function POST(request: Request) {
  // Early input validation
  if (!(request.headers.get("content-type")?.split(";")[0].trim() === "application/json")) {
    return Response.json(
      { error: "Content-Type must be application/json" },
      { status: 415 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    // Syntactic + semantic (zxcvbn) failure - 400 with per-field messages.
    return Response.json(
      { error: "Validation failed", fields: validationError(parsed.error) },
      { status: 400 },
    );
  }

  const input = parsed.data; // already trimmed/lowercased by the schema

  const ip = clientIp(request);

  // rate limit by IP
  if (await ipLimiter.blockedRemaining(ipKey(ip)) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // rate limit by account
  if (await accountLimiter.blockedRemaining(accountKey(input.email)) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // create user, hash password and store in DB
  // check email/username uniqueness
  let user: Awaited<ReturnType<typeof db.user.create>>;
  const passwordHash = await hashPassword(input.password);
  try {
    user = await db.user.create({
      data: { email: input.email, username: input.username, passwordHash },
    });
  } catch (error) {
    await ipLimiter.recordFailure(ipKey(ip));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return Response.json({ error: "Email or username already exists" }, { status: 409 });
    throw error;
  }

  // email verification: one-time opaque token (OWASP: >= 32 chars, secure RNG,
  // single use, time limited). Store only hash, raw token is sent to email.
  const token = generateVerificationToken();
  await db.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashVerificationToken(token),
      expiresAt: verificationExpiresAt(),
    },
  });
  try {
    await sendVerificationEmail(input.email, token);
  } catch (error) {
    console.error("[email] verification send fail error:", error);
  }

  // TODO: create script to remove abandoned signup pile up every 24h
  // delete verifiedAt === null + no oauth

  return Response.json({ ok: true }, { status: 201 });
}
