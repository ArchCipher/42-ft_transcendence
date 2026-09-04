import { isAuthorized } from "@/lib/auth/internal";
import { prisma as db } from "@synctext/db";

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

// load the persisted Yjs state for the document requested by hocuspocus
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // id should match the hocuspocus documentName and the prisma Document.id
  const document = await db.document.findUnique({
    where: { id },
    select: { ystate: true },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  // the document exists but has no persisted Yjs state yet
  if (!document.ystate) {
    return new Response(null, { status: 204 });
  }

  // send the binary Yjs state directly in the HTTP response body
  return new Response(Buffer.from(document.ystate), {
    headers: {
      "content-type": "application/octet-stream",
    },
  });
}

// save the latest Yjs state received from hocuspocus
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // this endpoint expects raw binary Yjs state
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/octet-stream"
  ) {
    return Response.json(
      { error: "Content-Type must be application/octet-stream" },
      { status: 415 },
    );
  }

  const state = Buffer.from(await request.arrayBuffer());

  if (state.length === 0) {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }

  const { id } = await params;

  const result = await db.$transaction(async (tx) => {
    const document = await tx.document.findUnique({
      where: { id },
      select: { ystate: true },
    });

    if (!document) return "not-found" as const;

    const previousState = document.ystate
      ? Buffer.from(document.ystate)
      : null;

    // hocuspocus can ask us to persist a state that is already current
    if (previousState?.equals(state)) return "unchanged" as const;

    if (previousState) {
      const latestSnapshot = await tx.documentSnapshot.findFirst({
        where: { documentId: id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      const snapshotDue =
        !latestSnapshot ||
        Date.now() - latestSnapshot.createdAt.getTime() >= SNAPSHOT_INTERVAL_MS;

      if (snapshotDue) {
        // preserve the last persisted state before replacing it
        await tx.documentSnapshot.create({
          data: {
            documentId: id,
            ystate: previousState,
          },
        });
      }
    }

    await tx.document.update({
      where: { id },
      data: { ystate: state },
    });

    return "updated" as const;
  });

  if (result === "not-found") {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
