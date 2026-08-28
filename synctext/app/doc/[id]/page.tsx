import { notFound, redirect } from "next/navigation"
import { prisma as db } from "@synctext/db"
import { getSessionToken, validateSession } from "@/lib/auth/session"
import { documentReadWhere } from "@/lib/documents/documents"
import { identityFromUser } from "@/lib/sync/sync-user"
import { SyncEditorPage } from "@/components/sync/sync-editor"

// Opens an existing document for collaborative editing; owner/collaborator only.
export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await validateSession(await getSessionToken())
  if (!session?.user?.id) redirect("/auth")

  const document = await db.document.findFirst({
    where: { id, ...documentReadWhere(session.user.id) },
    select: { id: true },
  })
  if (!document) notFound()

  return <SyncEditorPage docId={id} user={identityFromUser(session.user)} />
}
