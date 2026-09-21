import { z } from "zod";
import { prisma as db, Prisma } from "@synctext/db";
import {
  getSessionToken,
  validateSession,
  logoutCurrentSession,
} from "@/lib/auth/session";
import { usernameSchema } from "@/lib/auth/validation";
import { parseRequest } from "@/lib/auth/parse-request";

/*
Own profile: read via the server-rendered page, mutations happen here.

API Response contracts: /api/profile

	GET   — not provided: the page renders profile from the session server-side
	PUT   { username?, avatarUrl? }  (at least one required)
		  avatarUrl: image data URL or http(s) URL; `null` removes the avatar
		  200 → { ok: true, user: { username, avatarUrl } }
		  400 → { error, fields: { username? } }
		  401 → { error: "Unauthorized" }
		  409 → { error: "Email or username already exists" }
		  500 → { error } (unhandled server error)
	DELETE — requires an active session; no body
		  200 → { ok: true }
		  401 → { error: "Unauthorized" }
		  500 → { error } (unhandled server error)
*/

const avatarUrlSchema = z
  .string()
  .max(2_100_000, "Image too large")
  .refine(
    (v) => v.startsWith("data:image/") || /^https?:\/\//.test(v),
    "Avatar must be an image (data URL or http(s) URL)",
  )
  .nullable();

const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    avatarUrl: avatarUrlSchema.optional(),
  })
  .strict();

async function requireApiSession() {
  const session = await validateSession(await getSessionToken());
  if (!session?.user?.id) {
    return {
      session: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;

  const user = auth.session!.user;

  const result = await parseRequest(request, updateProfileSchema);
  if (result.error) return result.error;

  const input = result.data;

  const usernameChanged =
    input.username !== undefined && input.username !== user.username;
  const avatarChanged =
    input.avatarUrl !== undefined && input.avatarUrl !== user.avatarUrl;

  if (!usernameChanged && !avatarChanged) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const data: {
    username?: string;
    email?: string;
    emailVerifiedAt?: Date | null;
    avatarUrl?: string | null;
  } = {};
  if (usernameChanged) data.username = input.username;
  if (avatarChanged) data.avatarUrl = input.avatarUrl;

  try {
    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: { username: true, email: true, avatarUrl: true },
    });

    return Response.json({ ok: true, user: updated }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "Email or username already exists" },
        { status: 409 },
      );
    }
    throw error;
  }
}

// Remove the account and everything owned by it, then drop the session.
export async function DELETE() {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;

  const user = auth.session!.user;

  // Owned documents (snapshots cascade), then the user (sessions, tokens and
  // shares cascade). Deleting in this order avoids FK violations on Document.
  await db.$transaction([
    db.document.deleteMany({ where: { ownerId: user.id } }),
    db.user.delete({ where: { id: user.id } }),
  ]);

  await logoutCurrentSession();

  return Response.json({ ok: true }, { status: 200 });
}
