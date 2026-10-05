import { FriendshipStatus, GroupRole, Prisma, type PrismaClient } from "@synctext/db";
import { removeFromGroup, type RemovalResult } from "@/lib/groups/ownership";

// Group mutations. They hold the product rules that bind everyone; who may call
// them is decided by the routes, with lib/permissions.ts.

// OWNER is never assigned directly: ownership only moves through removeFromGroup
// and transferOwnership, which keep exactly one owner.
export type AssignableRole = typeof GroupRole.ADMIN | typeof GroupRole.MEMBER;

// Create a shared group owned by its creator.
export async function createGroup(
  db: PrismaClient,
  userId: string,
  name: string,
): Promise<{ id: string }> {
  return db.group.create({
    data: { name, members: { create: { userId, role: GroupRole.OWNER } } },
    select: { id: true },
  });
}

// False for a private space, whose name is a constant never shown.
export async function renameGroup(
  db: PrismaClient,
  groupId: string,
  name: string,
): Promise<boolean> {
  const { count } = await db.group.updateMany({
    where: { id: groupId, isPrivateSpace: false },
    data: { name },
  });
  return count === 1;
}

// Delete a group with its documents. False for a private space, which only
// goes with the account.
export async function deleteGroup(db: PrismaClient, groupId: string): Promise<boolean> {
  const { count } = await db.group.deleteMany({
    where: { id: groupId, isPrivateSpace: false },
  });
  return count === 1;
}

export type AddMemberResult = "added" | "private" | "not_friend" | "already_member";

// Add someone as a plain member. Only an accepted friend of the adder, whoever
// sent the request; an unknown user is answered the same, as not_friend.
export async function addMember(
  db: PrismaClient,
  groupId: string,
  userId: string,
  addedById: string,
): Promise<AddMemberResult> {
  const group = await db.group.findUniqueOrThrow({
    where: { id: groupId },
    select: { isPrivateSpace: true },
  });
  if (group.isPrivateSpace) return "private";

  const [userAId, userBId] = [userId, addedById].sort();
  const friendship = await db.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true },
  });
  if (friendship?.status !== FriendshipStatus.ACCEPTED) return "not_friend";

  try {
    await db.groupMember.create({ data: { groupId, userId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "already_member";
    }
    throw error;
  }
  return "added";
}

export type LeaveResult = "not_member" | "private" | RemovalResult;

// Leave a group, handing ownership on if needed. A private space cannot be left.
export async function leaveGroup(
  db: PrismaClient,
  groupId: string,
  userId: string,
): Promise<LeaveResult> {
  return db.$transaction(async (tx) => {
    const membership = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { group: { select: { isPrivateSpace: true } } },
    });
    if (!membership) return "not_member";
    if (membership.group.isPrivateSpace) return "private";

    return removeFromGroup(tx, groupId, userId);
  });
}

// Remove someone else. Never the owner. Their document grants go by cascade.
export async function removeMember(
  db: PrismaClient,
  groupId: string,
  userId: string,
): Promise<boolean> {
  const { count } = await db.groupMember.deleteMany({
    where: { groupId, userId, role: { not: GroupRole.OWNER } },
  });
  return count === 1;
}

// Promote a member to admin or demote an admin. Never the owner.
export async function setMemberRole(
  db: PrismaClient,
  groupId: string,
  userId: string,
  role: AssignableRole,
): Promise<boolean> {
  const { count } = await db.groupMember.updateMany({
    where: { groupId, userId, role: { not: GroupRole.OWNER } },
    data: { role },
  });
  return count === 1;
}
