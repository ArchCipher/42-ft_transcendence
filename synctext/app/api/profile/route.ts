import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma as db, Prisma } from "@synctext/db";
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import { usernameSchema } from "@/lib/auth/validation";
import { parseRequest } from "@/lib/auth/parse-request";
import { accountLimiter, accountKey } from "@/lib/auth/rate-limit";
import { AVATAR_MAX_BYTES } from "@synctext/shared/constants";
import { validateAvatarDataUrl } from "@/lib/auth/avatar";

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

	Deleting the account is DELETE /api/account, which hands owned groups on.
*/

/*
NOTE: Math.ceil(AVATAR_MAX_BYTES * 1.37) + 128
Cheap string-length pre-filter.
Base64 inflates (3bytes -> 4chars), and "data:image/png;base64," prefix
adds 22 more, so a 500KB image is ~682,690 chars. 1.37 is deliberately loose
*/
const avatarUrlSchema = z
  .string()
  .max(Math.ceil(AVATAR_MAX_BYTES * 1.37) + 128, "Image too large")
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

  const maxBodyBytes = Math.ceil(AVATAR_MAX_BYTES * 1.37) + 4096;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    return Response.json({ error: "Image too large" }, { status: 413 });
  }

  const limitKey = accountKey(user.email);
  if ((await accountLimiter.blockedRemaining(limitKey)) > 0) {
    return Response.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const result = await parseRequest(request, updateProfileSchema);
  if (result.error) return result.error;

  const input = result.data;

  if (input.avatarUrl !== undefined && input.avatarUrl !== null) {
    const check = validateAvatarDataUrl(input.avatarUrl);
    if (!check.ok) {
	  // a rejected payload counts as an attempt and cleared on success
      await accountLimiter.recordFailure(limitKey);
      return Response.json({ error: check.error }, { status: 400 });
    }
  }

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

    await accountLimiter.clear(limitKey);
    revalidatePath("/", "layout");
    return Response.json(
      { ok: true, user: { username: updated.username, email: updated.email } },
      { status: 200 },
    );
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