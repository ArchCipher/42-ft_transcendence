import { Prisma, GroupRole } from "./generated/prisma/client.js";

// Internal label for a private group. Never rendered: the UI labels that tab
// from isPrivate, so this string is not translated.
export const PRIVATE_GROUP_NAME = "Private";

/**
 * Give a user the group they own alone.
 *
 * Shared by registration and the seed so the two cannot drift. A user without
 * one has nowhere to create documents, so registration must run this in the
 * same transaction that creates the account.
 */
export async function createPrivateGroup(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{ id: string }> {
  return tx.group.create({
    data: {
      name: PRIVATE_GROUP_NAME,
      privateForUserId: userId,
      members: { create: { userId, role: GroupRole.OWNER } },
    },
    select: { id: true },
  });
}
