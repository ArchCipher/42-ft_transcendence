import { validationError, verifyEmailSchema } from "@/lib/auth/validation";
import { hashVerificationToken } from "@/lib/auth/verification";
import { prisma as db } from "@synctext/db";

/*
API Response contracts: GET /api/auth/verify-email?token=xxx

	Request: token in query string (?token=xxx)
	Response:
		200 → { ok: true }
		400 → { error, fields: { token? } }
		   or { error: "Invalid or expired verification link" }
		500 → { error } (unhandled server error)
*/

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const parsed = verifyEmailSchema.safeParse({ token });
  if (!parsed.success)
    return Response.json(
      { error: "Validation failed", fields: validationError(parsed.error) },
      { status: 400 },
    );

  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashVerificationToken(parsed.data.token) },
  });

  if (!record || record.usedAt !== null || record.expiresAt < new Date())
    return Response.json(
      { error: "Invalid or expired verification link" },
      { status: 400 },
    );

  // record email verification, revoke verification token
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }), // update user row
    db.emailVerificationToken.update({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    }), // update token
  ]);

  return Response.json({ ok: true }, { status: 200 });
}
