import "server-only";

import { randomBytes } from "node:crypto";
import { prisma as db } from "@synctext/db";
import { OAuthError, PROVIDER, type VerifiedIdentity } from "./identity";
import { USERNAME_MAX } from "@synctext/shared";
import { createUserWithPrivateSpace } from "../create-user";

/*
Account resolution and the provider-linking policy.

The single rule that governs this file: the OIDC subject is the only identity
key. Email is never used to match an account, under any circumstances.
*/

const USERNAME_ATTEMPTS = 8;
const USERNAME_SEED_MAX = 16;

/*
Build username from email, capped at 16 chars. The allowlist in usernameSchema
is /^[a-zA-Z0-9_]+$/, so other chars are stripped.
*/
function usernameSeed(identity: VerifiedIdentity): string {
  const local = identity.email.split("@")[0];
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_SEED_MAX);
  return cleaned.length >= 3 ? cleaned : "user";
}

// Build username: <seed>_<random>
async function uniqueUsername(identity: VerifiedIdentity): Promise<string> {
  const seed = usernameSeed(identity);

  for (let attempt = 0; attempt < USERNAME_ATTEMPTS; attempt += 1) {
    const suffix = randomBytes(4).toString("hex"); // 8 chars
    const candidate = `${seed}_${suffix}`.slice(0, USERNAME_MAX);
    const taken = await db.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  throw new OAuthError("invalid_id_token", "could not allocate a username");
}

/*
Resolve the sign-in subject to a local user, creating one only when no email
collision exists.
*/
export async function signInOrCreate(
  identity: VerifiedIdentity,
): Promise<string> {
  const existing = await db.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER,
        providerAccountId: identity.subject,
      },
    },
    select: { userId: true },
  });
  if (existing) return existing.userId;

  const collision = await db.user.findUnique({
    where: { email: identity.email },
    select: { id: true },
  });
  if (collision)
    throw new OAuthError(
      "account_exists",
      `an account already exists for ${identity.email}, link explicitly instead`,
    );

  const username = await uniqueUsername(identity);

  return await db.$transaction(async (tx) => {
    return createUserWithPrivateSpace(tx, {
      email: identity.email,
      username,
      passwordHash: null,
      // Only a true `email_verified` claim earns a verified timestamp.
      emailVerifiedAt: identity.emailVerified ? new Date() : null,
      accounts: {
        create: {
          provider: PROVIDER,
          providerAccountId: identity.subject,
          emailAtLinkTime: identity.email,
        },
      },
    });
  });
}

/*
Attach a provider identity to an already authenticated user. The session is
the proof: this is only reachable by presenting a valid session token.
*/
export async function linkAccount(
  userId: string,
  identity: VerifiedIdentity,
): Promise<void> {
  const existing = await db.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER,
        providerAccountId: identity.subject,
      },
    },
    select: { userId: true },
  });

  if (existing)
    throw new OAuthError(
      "link_conflict",
      "this identity is linked to another account",
    );

  await db.oAuthAccount.create({
    data: {
      userId,
      provider: PROVIDER,
      providerAccountId: identity.subject,
      emailAtLinkTime: identity.email,
    },
  });
}

// NOTE: Refuse to remove if no password is set
export async function unlinkAccount(
  userId: string,
  provider: string,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash)
    throw new OAuthError(
      "last_method",
      "set a password before removing this sign-in method",
    );

  await db.oAuthAccount.deleteMany({ where: { userId, provider } });
}
