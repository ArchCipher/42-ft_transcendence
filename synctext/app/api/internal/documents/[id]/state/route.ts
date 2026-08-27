import { prisma as db } from "@synctext/db";

// authenticate internal service requests using the shared service token
function isAuthorized(request: Request) {
  const token = request.headers.get("x-internal-service-token");

  return (
    process.env.INTERNAL_SERVICE_TOKEN &&
    token === process.env.INTERNAL_SERVICE_TOKEN
  );
}

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

  // check that the document exists before trying to update its saved state
  const document = await db.document.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  // prisma stores the binary Yjs state in the Document.ystate column
  await db.document.update({
    where: { id },
    data: { ystate: state },
  });

  return Response.json({ ok: true });
}
