import { GroupRole, type PrismaClient } from "@synctext/db";

// Grant mutations. A grant row makes a member an editor of one document; who
// may call them is decided by the routes, with canEdit.

type Refusal = "not_member" | "owner";

// The target's membership in the document's group, unless it cannot hold a
// grant: outside the group, or the owner, who always edits.
async function grantableMembership(
  db: PrismaClient,
  groupId: string,
  userId: string,
): Promise<{ id: string } | Refusal> {
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true, role: true },
  });
  if (!membership) return "not_member";
  if (membership.role === GroupRole.OWNER) return "owner";
  return { id: membership.id };
}

// Make a member an editor of one document. Granting twice is not an error.
export async function grantEdit(
  db: PrismaClient,
  documentId: string,
  groupId: string,
  userId: string,
): Promise<"granted" | Refusal> {
  const membership = await grantableMembership(db, groupId, userId);
  if (typeof membership === "string") return membership;

  await db.documentGrant.createMany({
    data: { membershipId: membership.id, documentId },
    skipDuplicates: true,
  });
  return "granted";
}

// Take a member back to viewer on one document. Revoking twice is not an error.
export async function revokeEdit(
  db: PrismaClient,
  documentId: string,
  groupId: string,
  userId: string,
): Promise<"revoked" | Refusal> {
  const membership = await grantableMembership(db, groupId, userId);
  if (typeof membership === "string") return membership;

  await db.documentGrant.deleteMany({
    where: { membershipId: membership.id, documentId },
  });
  return "revoked";
}
