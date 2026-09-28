import { Prisma, GroupRole, type PrismaClient } from "@synctext/db";

/**
 * Every permission in the app is decided here, from two facts: the caller's
 * role in a group, and whether they hold a grant on the document at hand.
 *
 * Fetching those facts is async and happens once per request. Deciding from
 * them is pure, so the same rule runs on a list row and on a single action.
 */

export type Rights = {
  /** The group the document is in. Resolving rights at all proves it has one. */
  groupId: string;
  groupRole: GroupRole;
  /** A DocumentGrant row exists for this member on this document. The row has
   *  no role: its existence means editor. */
  hasGrant: boolean;
};

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

// Prisma where-fragment: any member of the document's group (read access).
// Rule 6 — a group member views every document of that group.
export function documentReadWhere(userId: string): Prisma.DocumentWhereInput {
  return { group: { members: { some: { userId } } } };
}

// Select-fragment pairing the caller's group role with their grant on the same
// row, so a listing resolves rights without a query per document.
export function documentAccessSelect(userId: string) {
  return {
    group: {
      select: { id: true, members: { where: { userId }, select: { role: true } } },
    },
    grants: { where: { membership: { userId } }, select: { membershipId: true } },
  } satisfies Prisma.DocumentSelect;
}

type AccessRow = {
  // Null for a guest document, which belongs to a session, not to a group.
  group: { id: string; members: Array<{ role: GroupRole }> } | null;
  grants: Array<unknown>;
};

// Pure: reads a row already fetched with documentAccessSelect. Null when the
// caller is not a member of the group, which callers answer with 404. A guest
// document has no group, so it resolves to no rights for every user.
export function resolveRights(row: AccessRow): Rights | null {
  const group = row.group;
  if (!group) return null;

  const groupRole = group.members[0]?.role;
  if (!groupRole) return null;

  return { groupId: group.id, groupRole, hasGrant: row.grants.length > 0 };
}

// Load the caller's role in one group. Null when they are not a member.
export async function requireGroupRole(
  db: PrismaClient,
  userId: string,
  groupId: string,
): Promise<GroupRole | null> {
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  });

  return membership?.role ?? null;
}

// Load the caller's rights on one document. Not a member and no such document
// are the same answer: an outsider must not learn that the document exists.
export async function requireDocRights(
  db: PrismaClient,
  userId: string,
  documentId: string,
): Promise<Rights | null> {
  const document = await db.document.findUnique({
    where: { id: documentId },
    select: documentAccessSelect(userId),
  });

  return document ? resolveRights(document) : null;
}

// ---------------------------------------------------------------------------
// Deciding — pure, and the only place these rules are written
// ---------------------------------------------------------------------------

/** Write to a document, rename it, delete it, and change its grants.
 *  The owner of a group holds it by default; everyone else needs a grant. */
export function canEdit(rights: Rights): boolean {
  return rights.groupRole === GroupRole.OWNER || rights.hasGrant;
}

/** Add members, remove plain members. */
export function canAdminGroup(groupRole: GroupRole): boolean {
  return groupRole === GroupRole.OWNER || groupRole === GroupRole.ADMIN;
}

/** Rename and delete the group, promote, demote and remove admins. */
export function canOwnGroup(groupRole: GroupRole): boolean {
  return groupRole === GroupRole.OWNER;
}
