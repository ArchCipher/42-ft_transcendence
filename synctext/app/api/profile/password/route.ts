import { z } from "zod";
import { prisma as db } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { parseRequest } from "@/lib/auth/parse-request";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isPasswordStrong } from "@/lib/auth/password-strength";
import { accountLimiter, accountKey } from "@/lib/auth/rate-limit";

/*
Change the password of the logged-in account. Unlike the forgot-password flow
this requires the CURRENT password and keeps the active session alive (only
sibling sessions are revoked), so a user changing their password in their
profile is never logged out.

API Response contracts: POST /api/profile/password

	POST { currentPassword, newPassword, confirmPassword }
		200 → { ok: true }
		400 → { error, fields: { currentPassword?, newPassword?, confirmPassword? } }
		   or { error: "Password too weak" }
		401 → { error: "Unauthorized" }
		429 → { error: "Too many attempts" }
		500 → { error } (unhandled server error)
*/

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(1, "Enter a new password"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .strict();

export async function POST(request: Request) {
  const session = await validateSession(await getSessionToken());
  const user = session?.user;
  if (!session || !user?.id || !user.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await parseRequest(request, passwordChangeSchema);
  if (result.error) return result.error;

  const { currentPassword, newPassword, confirmPassword } = result.data;

  if (newPassword !== confirmPassword) {
    return Response.json(
      {
        error: "New passwords do not match.",
        fields: { confirmPassword: ["Passwords do not match."] },
      },
      { status: 400 },
    );
  }

  const key = accountKey(user.email);
  if ((await accountLimiter.blockedRemaining(key)) > 0) {
    return Response.json({ error: "Too many attempts" }, { status: 429 });
  }

  // Oauth has no password to confirm
  if (user.passwordHash) {
    if (!currentPassword)
      return Response.json(
        { error: "Enter your current password." },
        { status: 400 },
      );
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      await accountLimiter.recordFailure(key);
      return Response.json(
        { error: "Current password is incorrect." },
        { status: 400 },
      );
    }
  }
  if (currentPassword === newPassword) {
    return Response.json(
      {
        error: "Password unchanged.",
        fields: {
          newPassword: [
            "New password must be different from your old password.",
          ],
        },
      },
      { status: 400 },
    );
  }

  const strength = isPasswordStrong(newPassword, [user.username, user.email]);
  if (!strength.ok) {
    return Response.json(
      {
        error: "Password too weak",
        fields: { newPassword: [strength.feedback] },
      },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    // keep the CURRENT session alive; revoke every other one
    db.session.updateMany({
      where: { userId: user.id, id: { not: session.id }, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await accountLimiter.clear(key);

  return Response.json({ ok: true }, { status: 200 });
}
