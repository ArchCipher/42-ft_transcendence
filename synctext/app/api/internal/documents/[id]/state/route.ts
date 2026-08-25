import { prisma as db } from "@synctext/db";

// authenticate internal service requests using the shared service token
function isAuthorized(request: Request) {
  const token = request.headers.get("x-internal-service-token");

  return (
    process.env.INTERNAL_SERVICE_TOKEN &&
    token === process.env.INTERNAL_SERVICE_TOKEN
  );
}

// validate the Base64 string before converting it back into binary Yjs state
function decodeBase64(value: string) {
  if (
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  ) {
    return null;
  }

  const decoded = Buffer.from(value, "base64");

  // re-encoding catches malformed Base64 that Buffer.from may accept silently
  if (decoded.toString("base64") !== value) {
    return null;
  }

  return decoded;
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

  // send Yjs state as Base64 because JSON cannot carry raw binary bytes directly
  return Response.json({
    state: document.ystate
      ? Buffer.from(document.ystate).toString("base64")
      : null,
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

  // this endpoint expects the Yjs state inside a JSON request body
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  ) {
    return Response.json(
      { error: "Content-Type must be application/json" },
      { status: 415 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // make sure the request contains a string field called state
  if (
    typeof body !== "object" ||
    body === null ||
    !("state" in body) ||
    typeof body.state !== "string"
  ) {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }

  // convert the Base64 transport format back into binary Yjs state
  const state = decodeBase64(body.state);

  if (!state) {
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
