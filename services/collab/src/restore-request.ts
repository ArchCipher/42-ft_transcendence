import type { ServerResponse } from "node:http";
import type { onRequestPayload } from "@hocuspocus/server";
import { RestoreError, restoreSnapshot } from "./restore-snapshot.js";
import { internalToken } from "./web-api.js";

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export async function handleRestoreRequest({ request, response, instance }: onRequestPayload) {
  if (request.headers["x-internal-service-token"] !== internalToken) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (request.headers["content-type"]?.split(";")[0].trim() !== "application/octet-stream") {
    sendJson(response, 415, { error: "Content-Type must be application/octet-stream" });
    return;
  }

  const url = new URL(request.url ?? "/", "http://collab");
  const documentName = url.searchParams.get("documentId");
  const tokenHash = request.headers["x-session-token-hash"];

  if (!documentName || typeof tokenHash !== "string" || !/^[a-f0-9]{64}$/.test(tokenHash)) {
    sendJson(response, 400, { error: "Document id and session token hash are required" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }

    const recoverySnapshotId = await restoreSnapshot(
      instance,
      documentName,
      tokenHash,
      Buffer.concat(chunks),
    );

    sendJson(response, 200, { ok: true, recoverySnapshotId });
  } catch (error) {
    if (error instanceof RestoreError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }

    console.error("Snapshot restore failed:", error);
    sendJson(response, 503, { error: "Could not complete restore. Refresh the document before trying again." });
  }
}
