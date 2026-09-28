import { Prisma, type GroupRole } from "@synctext/db";
import { canEdit, documentAccessSelect, type Rights } from "@/lib/permissions";

export type DocumentSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Which tab this document belongs under. */
  groupId: string;
  // Display only. Null once the account that created it is gone.
  createdBy: {
    id: string;
    username: string;
  } | null;
  // Both are canEdit today: an editor may rename and delete. Kept as two
  // fields so the dashboard's props do not change.
  canRename: boolean;
  canDelete: boolean;
};

/** One member of a document's group, and whether they may edit it. */
export type DocumentEditorSummary = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: GroupRole;
  canEdit: boolean;
};

// Everything a summary needs, including the caller's role and grant.
export const summarySelect = (userId: string) =>
  ({
    id: true,
    title: true,
    createdAt: true,
    updatedAt: true,
    createdBy: {
      select: {
        id: true,
        username: true,
      },
    },
    ...documentAccessSelect(userId),
  }) satisfies Prisma.DocumentSelect;

type SummaryDocument = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; username: string } | null;
};

export function toDocumentSummary(
  document: SummaryDocument,
  rights: Rights,
): DocumentSummary {
  const editable = canEdit(rights);

  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    groupId: rights.groupId,
    createdBy: document.createdBy,
    canRename: editable,
    canDelete: editable,
  };
}
