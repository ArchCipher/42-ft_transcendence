import { GroupRole, type Prisma, type PrismaClient } from "@synctext/db";

export type RemovalResult = "left" | "transferred" | "group_deleted";

// Take a member out of a group. An owner hands it to the oldest admin, else the
// oldest member, or deletes it when alone. Enforces no product rule: callers do.
export async function removeFromGroup(
  tx: Prisma.TransactionClient,
  groupId: string,
  userId: string,
): Promise<RemovalResult> {
  await tx.$queryRaw`SELECT "id" FROM "GroupMember" WHERE "groupId" = ${groupId} FOR UPDATE`;

  const leaving = await tx.groupMember.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true, role: true },
  });

  await tx.groupMember.delete({ where: { id: leaving.id } });
  if (leaving.role !== GroupRole.OWNER) return "left";

  const oldest = (role: GroupRole) =>
    tx.groupMember.findFirst({
      where: { groupId, role },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
  const successor = (await oldest(GroupRole.ADMIN)) ?? (await oldest(GroupRole.MEMBER));

  if (!successor) {
    await tx.group.delete({ where: { id: groupId } });
    return "group_deleted";
  }

  await tx.groupMember.update({
    where: { id: successor.id },
    data: { role: GroupRole.OWNER },
  });
  return "transferred";
}

// Delete an account: leaving every group removes the private space and its
// documents too. Memberships must go first, GroupMember.user is Restrict.
export async function deleteUser(db: PrismaClient, userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const memberships = await tx.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    for (const { groupId } of memberships) {
      await removeFromGroup(tx, groupId, userId);
    }

    await tx.user.delete({ where: { id: userId } });
  });
}
