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
