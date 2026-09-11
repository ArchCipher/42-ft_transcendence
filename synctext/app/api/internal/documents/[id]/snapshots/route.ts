import { isAuthorized } from "@/lib/auth/internal";
import { createDocumentSnapshot } from "@/lib/documents/snapshots";
import { prisma as db } from "@synctext/db";
import * as Y from "yjs";

function isValidSnapshotState(state: Uint8Array) {
  const document = new Y.Doc();

  try {
    Y.applyUpdate(document, state);
    return true;
  } catch {
    return false;
  } finally {
    document.destroy();
  }
}

// collab supplies the live state because the last database save may be older
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/octet-stream"
  ) {
    return Response.json(
      { error: "Content-Type must be application/octet-stream" },
      { status: 415 },
    );
  }

  const state = new Uint8Array(await request.arrayBuffer());

  if (state.length === 0 || !isValidSnapshotState(state)) {
    return Response.json({ error: "Invalid snapshot state" }, { status: 400 });
  }

  const { id } = await params;

  const snapshot = await db.$transaction(async (tx) => {
    // use the same lock as autosave to keep snapshot retention consistent
    const lockedDocuments = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Document"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    if (lockedDocuments.length === 0) return null;

    // a recovery snapshot must not wait for the automatic snapshot interval
    return createDocumentSnapshot(tx, id, state);
  });

  if (!snapshot) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  return Response.json(
    { id: snapshot.id, createdAt: snapshot.createdAt.toISOString() },
    { status: 201 },
  );
}
