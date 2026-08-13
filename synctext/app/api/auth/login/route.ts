import { loginSchema, validationError } from "@/lib/auth/validation";
import { clientIp, ipLimiter, accountLimiter, ipKey, accountKey } from "@/lib/auth/rate-limit";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import { generateSessionToken, hashSessionToken, sessionExpiresAt, setSessionCookie } from "@/lib/auth/session";
import { createHash } from "node:crypto";
import { db } from "@/lib/db"; // TODO: add prisma here!!!

// Login Handler: validation -> rate limit -> auth -> session
//
// Anti-enumeration (OWASP Auth Cheat Sheet + Copenhagen error handling):
// the schema does NOT distinguish "unknown email" from "wrong password".
// The route MUST also take the same code path for both cases (verify a dummy
// hash when the user doesn't exist) to avoid a timing oracle.

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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: validationError(parsed.error) },
      { status: 400 },
    );
  }

  const input = parsed.data; // email already lowercase -> lookup matches

  const ip = clientIp(request);

  // rate limit by IP
  if (await ipLimiter.blockedRemaining(ipKey(ip)) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // rate limit by account
  if (await accountLimiter.blockedRemaining(accountKey(input.email)) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // auth check
  const user = await db.user.findUnique({ where: { email: input.email } });

  // timing oracle fix: ONE code path for both cases
  // unknown user -> verify against a fixed dummy hash (with same params)
  const hash = user?.passwordHash ?? await getDummyHash();
  const ok = await verifyPassword(input.password, hash);

  if (!ok) {
    if (await ipLimiter.recordFailure(ipKey(ip))) // IP triggered
      console.warn(`[rate-limit] lockout ip:${ip}`);
    if (await accountLimiter.recordFailure(accountKey(input.email))) { // account triggered
      // redact PII in logs
      const emailHash = createHash("sha256").update(input.email).digest("hex").slice(0, 16);
      console.warn(`[rate-limit] lockout account:${emailHash}`);
    }
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // dummy hash never verifies, so reaching here means user exists
  if (!user) throw new Error("unreachable: dummy hash verified");

  if (user.emailVerifiedAt === null)
    return Response.json({ error: "Verify your email" }, { status: 403 });

  // success: reset any accumulated failures for ip/account
  await ipLimiter.clear(ipKey(ip));
  await accountLimiter.clear(accountKey(input.email));

  // create session
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  await db.$transaction([
    db.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }), // revoke previous sessions
    db.session.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt: sessionExpiresAt(),
        ip,
        userAgent: request.headers.get("user-agent") ?? null,
      },
    }), // create session: store hash, not the raw token
  ]);
  await setSessionCookie(token);

  return Response.json({ ok: true }, { status: 200 });
}
