import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { CloseEvent } from "@hocuspocus/common";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@synctext/shared";
import type {
  onAuthenticatePayload,
  beforeHandleMessagePayload,
  onAwarenessUpdatePayload,
} from "@hocuspocus/server";

// collab doesn't access postgres directly, it persists Yjs state through this internal Next.js API
const webUrl = requireEnv("WEB_INTERNAL_URL");
const internalToken = requireEnv("INTERNAL_SERVICE_TOKEN");
const SESSION_RECHECK_MS = 30000; // check session every 30s

function requireEnv(key: string): string {
  const val = process.env[key];
  if (val == null) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

// close codes: 4xxx is app-reserved (loose convention mirroring HTTP status codes)
const UNAUTHENTICATED: CloseEvent = {
  code: 4400,
  reason: "Unauthenticated connection",
};
const SESSION_REVOKED: CloseEvent = { code: 4401, reason: "Session revoked" };
const WRITE_REVOKED: CloseEvent = {
  code: 4403,
  reason: "Write access revoked",
};

type RecheckResult = "ok" | "session-revoked" | "write-revoked";

// context attached to every connection once authenticated
type AuthContext = {
  tokenHash: string;
  userId: string;
  connectionReadOnly: boolean;
  lastSessionCheck: number; // ms timestamp
};

async function verifySession(data: {
  tokenHash: string;
  documentName: string;
}) {
  const response = await fetch(`${webUrl}/api/internal/auth/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-service-token": internalToken,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) return null;
  const body = await response.json();
  if (!body.valid) return null;
  return body as { userId: string; readOnly: boolean };
}

/*
Revalidate session against DB and enforce sync downgrade/upgrade
*/
async function recheckAccess(
  ctx: AuthContext,
  documentName: string,
): Promise<RecheckResult> {
  const verified = await verifySession({
    tokenHash: ctx.tokenHash,
    documentName,
  });
  if (!verified) return "session-revoked";

  const wasWritable = !ctx.connectionReadOnly;
  ctx.connectionReadOnly = verified.readOnly;
  ctx.lastSessionCheck = Date.now();
  return wasWritable && verified.readOnly ? "write-revoked" : "ok";
}

const server = new Server({
  name: "hocuspocus-synctext",
  port: 1234,

  /*
Runs once, when HTTP connection is upgraded to Websocket and the client sends
its auth message.
The session cookie is carried in the upgrade request headers,
so we parse it from there. Hocuspocus's own 'token' is not used, we only
authenticate via the session cookie.
*/
  async onAuthenticate(data: onAuthenticatePayload) {
    const { documentName, requestHeaders, connectionConfig } = data;

    // parse session cookie from upgrade request headers
    const cookieHeader = requestHeaders.get("cookie"); // "session=abc123"
    const token = parseSessionCookie(cookieHeader);
    if (!token) throw UNAUTHENTICATED;

    const tokenHash = hashSessionToken(token);
    const verified = await verifySession({ tokenHash, documentName });
    if (!verified) throw UNAUTHENTICATED;

    // enforce readOnly at connection level
    connectionConfig.readOnly = verified.readOnly;
    connectionConfig.isAuthenticated = true;

    return {
      tokenHash,
      userId: verified.userId,
      connectionReadOnly: verified.readOnly,
      lastSessionCheck: Date.now(),
    } satisfies AuthContext;
  },

  // Runs before every inbound message on (each keystroke / update)
  async beforeHandleMessage(data: beforeHandleMessagePayload) {
    const ctx = data.context as AuthContext | undefined;
    if (!ctx) throw UNAUTHENTICATED;

    // skip the 30s cache window
    if (Date.now() - ctx.lastSessionCheck < SESSION_RECHECK_MS) return;

    // revalidate session against the DB (revocation / expiry)
    const result = await recheckAccess(ctx, data.documentName);
    if (result === "session-revoked") throw SESSION_REVOKED;
    if (result === "write-revoked") throw WRITE_REVOKED;
  },

  /*
    Kill the connection if
	1. connection was writable at connect, but is now read-only.
	2. session revoked

	A reconnect then re-opens them read-only via OnAuthenticate.
  */
  async onAwarenessUpdate(data: onAwarenessUpdatePayload) {
    const ctx = data.connection?.context as AuthContext | undefined;
    if (!ctx) return; // connection triggered on non-connection source
    if (Date.now() - ctx.lastSessionCheck < SESSION_RECHECK_MS) return;

    const result = await recheckAccess(ctx, data.documentName);
    const closeEvent =
      result === "session-revoked"
        ? SESSION_REVOKED
        : result === "write-revoked"
          ? WRITE_REVOKED
          : null;
    if (closeEvent) data.connection?.close(closeEvent);
  },

  // db extension connects hocuspocus's in memory Yjs docs to our persistent Document.ystate storage
  extensions: [
    new Database({
      // called when hocuspocus needs to restore a document
      fetch: async ({ documentName }) => {
        // documentName is expected to match the Prisma Document.id
        const response = await fetch(
          `${webUrl}/api/internal/documents/${encodeURIComponent(documentName)}/state`,
          {
            method: "GET",
            headers: {
              "x-internal-service-token": internalToken,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.status}`);
        }

        if (response.status === 204) {
          // 204 means doc exists but no persisted Yjs state yet
          return null;
        }

        const state = await response.arrayBuffer();

        return new Uint8Array(state);
      },

      // called when hocuspocus wants to persist the latest Yjs document state
      store: async ({ documentName, state }) => {
        const response = await fetch(
          `${webUrl}/api/internal/documents/${encodeURIComponent(documentName)}/state`,
          {
            method: "PUT",
            headers: {
              "content-type": "application/octet-stream",
              "x-internal-service-token": internalToken,
            },
            body: new Uint8Array(state),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to store document: ${response.status}`);
        }
      },
    }),
  ],
});

server.listen();

function parseSessionCookie(cookie: string | null): string | null {
  if (!cookie) return null;
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`),
  );
  return match?.[1] ?? null;
}
