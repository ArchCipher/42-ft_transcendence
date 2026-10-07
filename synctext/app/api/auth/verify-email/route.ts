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

  const now = new Date();

  // Claim the token and verify the account atomically
  const tokenHash = hashVerificationToken(parsed.data.token);
  const verified = await db.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });
    if (!record || record.usedAt !== null || record.expiresAt <= now)
      return false;

    // atomic conditional claim: only one concurrent request gets count === 1
    const claim = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    }); // update token
    if (claim.count === 0) return false;

    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: now },
    });

    return true;
  });

  if (!verified)
    return Response.json(
      { error: "Invalid or expired verification link" },
      { status: 400 },
    );

  return Response.json({ ok: true }, { status: 200 });
}
