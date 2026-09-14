import { notFound } from "next/navigation"
import { prisma as db } from "@synctext/db"
import { documentReadWhere } from "@/lib/documents/documents"
import { identityFromUser } from "@/lib/sync/sync-user"
import { SyncEditorPage } from "@/components/sync/sync-editor"
import { requireSession } from "@/lib/auth/guard"

// Opens an existing document for collaborative editing; owner/collaborator only.
export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession();

  const document = await db.document.findFirst({
    where: { id, ...documentReadWhere(session.user.id) },
    select: {
      id: true,
      title: true,
      ownerId: true,
      collab: {
        where: { userId: session.user.id },
        select: { docRole: true },
      },
    },
  })
  if (!document) notFound()

  const canEdit =
    document.ownerId === session.user.id || document.collab[0]?.docRole === "EDITOR"

  return (
    <SyncEditorPage
      docId={id}
      title={document.title}
      user={identityFromUser(session.user)}
      canEdit={canEdit}
    />
  )
}
