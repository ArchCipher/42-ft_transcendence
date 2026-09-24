import { prisma as db } from "@synctext/db";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { forbidden, notFound } from "@/lib/api/responses";
import { canEdit, requireDocRights } from "@/lib/permissions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> },
) {
  const session = await validateSession(await getSessionToken());
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, snapshotId } = await params;

  const rights = await requireDocRights(db, session.user.id, id);

  if (!rights) return notFound();
  if (!canEdit(rights)) return forbidden();

  // load the target before making a backup, since retention may remove it
  const snapshot = await db.documentSnapshot.findFirst({
    where: { id: snapshotId, documentId: id },
    select: { ystate: true },
  });

  if (!snapshot) {
    return Response.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const collabUrl = process.env.COLLAB_INTERNAL_URL;
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!collabUrl || !internalToken) {
    return Response.json({ error: "Snapshot restore is unavailable" }, { status: 503 });
  }

  try {
    const url = new URL("/internal/restore", collabUrl);
    url.searchParams.set("documentId", id);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "x-internal-service-token": internalToken,
        "x-session-token-hash": session.tokenHash,
      },
      body: new Uint8Array(snapshot.ystate),
      signal: AbortSignal.timeout(60000),
    });

    return Response.json(await response.json(), { status: response.status });
  } catch {
    // a lost response does not prove whether the restore completed
    return Response.json(
      { error: "Could not confirm restore. Refresh the document before trying again." },
      { status: 503 },
    );
  }
}
