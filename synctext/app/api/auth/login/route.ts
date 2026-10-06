import { loginSchema } from "@/lib/auth/validation";
import {
  clientIp,
  ipLimiter,
  accountLimiter,
  ipKey,
  accountKey,
} from "@/lib/auth/rate-limit";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";

import { prisma as db } from "@synctext/db";
import { hashForLog } from "@/lib/auth/log";
import { parseRequest } from "@/lib/auth/parse-request";
import { createSessionForUser } from "@/lib/auth/session-create";

/*
Login Handler: validation -> rate limit -> auth -> session

	Anti-enumeration (OWASP Auth Cheat Sheet + Copenhagen error handling):
	the schema does NOT distinguish "unknown email" from "wrong password".
	The route MUST also take the same code path for both cases (verify a dummy
	hash when the user doesn't exist) to avoid a timing oracle.

API Response contracts: POST /api/auth/login

	Request:  { email, password }
	Response:
		200 → { ok: true }
		400 → { error, fields: { email?, password? } }
		401 → { error: "Invalid email or password" }
		403 → { error: "Verify your email" }
		415 → { error: "Content-Type must be application/json" }
		429 → { error: "Too many attempts" }
		500 → { error } (unhandled server error)
*/

export async function POST(request: Request) {
  const result = await parseRequest(request, loginSchema);
  if (result.error) return result.error;

  const input = result.data;

  const ip = clientIp(request);

  // rate limit by IP
  if ((await ipLimiter.blockedRemaining(ipKey(ip))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // rate limit by account
  if ((await accountLimiter.blockedRemaining(accountKey(input.email))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // auth check
  const user = await db.user.findUnique({ where: { email: input.email } });

  // timing oracle fix: ONE code path for both cases
  // unknown user -> verify against a fixed dummy hash (with same params)
  const hash = user?.passwordHash ?? (await getDummyHash());
  const ok = await verifyPassword(input.password, hash);

  if (!ok) {
    if (await ipLimiter.recordFailure(ipKey(ip)))
      // IP triggered
      console.warn(`[rate-limit] lockout ip:${ip}`);
    if (await accountLimiter.recordFailure(accountKey(input.email))) {
      // account triggered
      // redact PII in logs
      const emailHash = hashForLog(input.email);
      console.warn(`[rate-limit] lockout account:${emailHash}`);
    }
    return Response.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  // dummy hash never verifies, so reaching here means user exists
  if (!user) throw new Error("unreachable: dummy hash verified");

  if (user.emailVerifiedAt === null)
    return Response.json({ error: "Verify your email" }, { status: 403 });

  // success: reset any accumulated failures for ip/account
  await ipLimiter.clear(ipKey(ip));
  await accountLimiter.clear(accountKey(input.email));

  // create session, revoke previous sessions (keep MAX_SESSIONS)
  const redirectTo = await createSessionForUser(user.id, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });
  return Response.json({ ok: true, redirectTo }, { status: 200 });
}
