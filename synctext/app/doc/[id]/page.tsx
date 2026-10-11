import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma as db } from "@synctext/db";
import { hashGuestSessionToken } from "@synctext/shared";

import { ExpiredGuestDocument } from "./expired-guest-document"
import { getGuestSessionToken } from "@/lib/auth/guest-session"
import { getCurrentDocumentActor } from "@/lib/documents/access"
import { canEdit, documentAccessSelect, resolveRights } from "@/lib/permissions"
import { identityFromGuestSession, identityFromUser } from "@/lib/sync/sync-user"
import { SyncEditorPage } from "@/components/sync/sync-editor"
import UserNavbar from "@/app/components/navigation/UserNavbar";
import PublicNavbar from "@/app/components/navigation/PublicNavbar";

export const metadata: Metadata = { title: "Document" };

async function ownsExpiredGuestDocument(documentId: string): Promise<boolean> {
  const token = await getGuestSessionToken();
  if (!token) return false;

  const guestSession = await db.guestSession.findUnique({
    where: { tokenHash: hashGuestSessionToken(token) },
    select: {
      expiresAt: true,
      document: { select: { id: true } },
    },
  });

  // Cleanup may already have cascaded the expired session/document away. The
  // browser-scoped opaque cookie is enough to show the non-sensitive expired
  // state; it never grants document access after the database deadline.
  if (!guestSession) return false

  return (
    guestSession.expiresAt.getTime() <= Date.now() &&
    guestSession.document?.id === documentId
  );
}

// Opens a document the caller reaches through their group, or the guest
// document bound to this browser's opaque guest-session cookie.
export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getCurrentDocumentActor()

  if (!actor) {
    if (await ownsExpiredGuestDocument(id)) return <ExpiredGuestDocument />;
    redirect("/auth");
  }

  if (actor.kind === "guest") {
    const document = await db.document.findFirst({
      where: { id, guestSessionId: actor.guestSessionId },
      select: { id: true, title: true },
    });
    if (!document) notFound();

    return (
      <div className="flex min-h-full flex-1 flex-col bg-[#020110]">
        <PublicNavbar />
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
      </div>
    );
  }

  const document = await db.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      ...documentAccessSelect(actor.userId),
    },
  });
  if (!document) notFound();

  // Not a member of the group: the document does not exist for this user.
  const rights = resolveRights(document)
  if (!rights) notFound()

  const editable = canEdit(rights)

  return (
	<div className="flex min-h-full flex-1 flex-col bg-[#020110]">
    <UserNavbar username={actor.username} avatarUrl={actor.avatarUrl} />
    <SyncEditorPage
      docId={document.id}
      title={document.title}
      user={identityFromUser({ id: actor.userId, username: actor.username })}
      canRename={editable}
      readOnly={!editable}
    />
	</div>
  )
}
