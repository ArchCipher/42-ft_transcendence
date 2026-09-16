import { notFound } from "next/navigation"
import { prisma as db } from "@synctext/db"
import { canEdit, documentAccessSelect, resolveRights } from "@/lib/permissions"
import { identityFromUser } from "@/lib/sync/sync-user"
import { SyncEditorPage } from "@/components/sync/sync-editor"
import { requireSession } from "@/lib/auth/guard"

// Opens an existing document for collaborative editing; group members only.
export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession();

  const document = await db.document.findUnique({
    where: { id },
    select: {
      title: true,
      ...documentAccessSelect(session.user.id),
    },
  })
  if (!document) notFound()

  // Not a member of the group: the document does not exist for this user.
  const rights = resolveRights(document)
  if (!rights) notFound()

  return (
    <SyncEditorPage
      docId={id}
      title={document.title}
      user={identityFromUser(session.user)}
      canEdit={canEdit(rights)}
    />
  )
}
