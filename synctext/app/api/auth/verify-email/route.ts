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

  const tokenHash = hashVerificationToken(parsed.data.token);
  const now = new Date();

  // Claim the token and mark the account verified in one transaction.
  const verified = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string; userId: string; usedAt: Date | null; expiresAt: Date }[]
    >`
      SELECT "id", "userId", "usedAt", "expiresAt"
      FROM "EmailVerificationToken"
      WHERE "tokenHash" = ${tokenHash}
      FOR UPDATE
    `;

    const record = rows[0];

    if (!record || record.usedAt !== null || record.expiresAt <= now)
      return false;

    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    });

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
