import { Prisma, GroupRole } from "./generated/prisma/client.js";

// Internal name for a private space. Never rendered: the client labels it from
// isPrivateSpace, so this string is not translated.
export const PRIVATE_SPACE_NAME = "Private";

/**
 * Give a user the group they own alone.
 *
 * Shared by registration and the seed so the two cannot drift. A user without
 * one has nowhere to create documents, so registration must run this in the
 * same transaction that creates the account — nothing in the database
 * guarantees that every user has exactly one.
 */
export async function createPrivateSpace(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{ id: string }> {
  return tx.group.create({
    data: {
      name: PRIVATE_SPACE_NAME,
      isPrivateSpace: true,
      members: { create: { userId, role: GroupRole.OWNER } },
    },
    select: { id: true },
  });
}
