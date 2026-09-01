import { prisma as db } from "@synctext/db";
import type { Prisma } from "@synctext/db";

export type DocumentAccess = "OWNER" | "EDITOR" | "VIEWER";

export type DocumentSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
  };
  access: DocumentAccess;
  canRename: boolean;
  canDelete: boolean;
};

// Prisma where-fragment: owner or any collaborator (read access).
export function documentReadWhere(userId: string): Prisma.DocumentWhereInput {
  return { OR: [{ ownerId: userId }, { collab: { some: { userId } } }] };
}

// Prisma where-fragment: owner or EDITOR collaborator (write access).
export function documentEditWhere(userId: string): Prisma.DocumentWhereInput {
  return { OR: [{ ownerId: userId }, { collab: { some: { userId, docRole: "EDITOR" } } }] };
}

// Highest access level a user has on a document, or null if they have none.
export async function documentAccessForUser(
  id: string,
  userId: string,
): Promise<DocumentAccess | null> {
  const document = await db.document.findFirst({
    where: { id, ...documentReadWhere(userId) },
    select: {
      ownerId: true,
      collab: { where: { userId }, select: { docRole: true } },
    },
  });

  if (!document) return null;
  if (document.ownerId === userId) return "OWNER";
  return document.collab[0]?.docRole ?? "VIEWER";
}
