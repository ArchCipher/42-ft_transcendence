import { notFound, redirect } from "next/navigation"
import { prisma as db } from "@synctext/db"
import { hashGuestSessionToken } from "@synctext/shared"

import { ExpiredGuestDocument } from "./expired-guest-document"
import { getGuestSessionToken } from "@/lib/auth/guest-session"
import { getCurrentDocumentActor } from "@/lib/documents/access"
import { documentReadWhere } from "@/lib/documents/documents"
import { identityFromGuestSession, identityFromUser } from "@/lib/sync/sync-user"
import { SyncEditorPage } from "@/components/sync/sync-editor"

async function ownsExpiredGuestDocument(documentId: string): Promise<boolean> {
  const token = await getGuestSessionToken()
  if (!token) return false

  const guestSession = await db.guestSession.findUnique({
    where: { tokenHash: hashGuestSessionToken(token) },
    select: {
      expiresAt: true,
      document: { select: { id: true } },
    },
  })

  // Cleanup may already have cascaded the expired session/document away. The
  // browser-scoped opaque cookie is enough to show the non-sensitive expired
  // state; it never grants document access after the database deadline.
  if (!guestSession) return true

  return (
    guestSession.expiresAt.getTime() <= Date.now() &&
    guestSession.document?.id === documentId
  )
}

// Opens a normal owner/collaborator document or the guest document bound to
// this browser's opaque guest-session cookie.
export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getCurrentDocumentActor()

  if (!actor) {
    if (await ownsExpiredGuestDocument(id)) return <ExpiredGuestDocument />
    redirect("/auth")
  }

  if (actor.kind === "guest") {
    const document = await db.document.findFirst({
      where: { id, guestSessionId: actor.guestSessionId },
      select: { id: true, title: true },
    })
    if (!document) notFound()

    return (
      <SyncEditorPage
        docId={document.id}
        title={document.title}
        user={identityFromGuestSession({ id: actor.guestSessionId })}
        canRename={actor.mode === "EDITABLE"}
        readOnly={actor.mode === "READ_ONLY"}
        guestState={{
          editExpiresAt: actor.editExpiresAt.toISOString(),
          expiresAt: actor.expiresAt.toISOString(),
        }}
      />
    )
  }

  const document = await db.document.findFirst({
    where: { id, ...documentReadWhere(actor.userId) },
    select: {
      id: true,
      title: true,
      ownerId: true,
      collab: {
        where: { userId: actor.userId },
        select: { docRole: true },
      },
    },
  })
  if (!document) notFound()

  const canRename =
    document.ownerId === actor.userId || document.collab[0]?.docRole === "EDITOR"

  return (
    <SyncEditorPage
      docId={document.id}
      title={document.title}
      user={identityFromUser({ id: actor.userId, username: actor.username })}
      canRename={canRename}
      readOnly={!canRename}
    />
  )
}
