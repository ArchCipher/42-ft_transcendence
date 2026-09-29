import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { CloseEvent } from "@hocuspocus/common";
import {
  GUEST_SESSION_COOKIE_NAME,
  hashGuestSessionToken,
  hashSessionToken,
  SESSION_COOKIE_NAME,
} from "@synctext/shared";
import { lockDocument, unlockDocument } from "./document-lock.js";
import { handleRestoreRequest } from "./restore-request.js";
import { loadDocumentState, saveDocumentState } from "./web-api.js";
import type {
  Connection,
  onAuthenticatePayload,
  beforeHandleMessagePayload,
  afterHandleMessagePayload,
  onAwarenessUpdatePayload,
  onRequestPayload,
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
type AuthCredential =
  | { kind: "user"; tokenHash: string }
  | { kind: "guest"; guestTokenHash: string };
type VerifiedAccess = {
  actor:
    | { kind: "user"; userId: string }
    | { kind: "guest"; guestSessionId: string };
  readOnly: boolean;
  editExpiresAt?: string;
  expiresAt?: string;
};

// context attached to every connection once authenticated
type AuthContext = {
  credential: AuthCredential;
  actor: VerifiedAccess["actor"];
  connectionReadOnly: boolean;
  lastSessionCheck: number; // ms timestamp
  // For guest connections this is also the exact edit-lock / expiry boundary,
  // preventing the normal 30-second cache from extending write access.
  nextAccessCheckAt: number;
  guestRecheckTimer?: ReturnType<typeof setTimeout>;
};

async function verifyAccess(
  data: AuthCredential & {
    documentName: string;
  },
): Promise<VerifiedAccess | null> {
  const credentialBody =
    data.kind === "user"
      ? { tokenHash: data.tokenHash }
      : { guestTokenHash: data.guestTokenHash };
  const response = await fetch(`${webUrl}/api/internal/auth/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-service-token": internalToken,
    },
    body: JSON.stringify({
      ...credentialBody,
      documentName: data.documentName,
    }),
  });
  if (!response.ok) return null;
  const body = await response.json();
  if (!body.valid) return null;
  if (
    !body.actor ||
    (body.actor.kind !== "user" && body.actor.kind !== "guest") ||
    typeof body.readOnly !== "boolean"
  ) {
    return null;
  }
  return body as VerifiedAccess;
}

function nextAccessCheckAt(verified: VerifiedAccess): number {
  const normalRecheck = Date.now() + SESSION_RECHECK_MS;
  if (verified.actor.kind !== "guest") return normalRecheck;

  const boundary = verified.readOnly
    ? Date.parse(verified.expiresAt ?? "")
    : Date.parse(verified.editExpiresAt ?? "");
  return Number.isFinite(boundary)
    ? Math.min(normalRecheck, boundary)
    : normalRecheck;
}

/*
Revalidate session against DB and enforce sync downgrade/upgrade
*/
async function recheckAccess(
  ctx: AuthContext,
  documentName: string,
): Promise<RecheckResult> {
  const verified = await verifyAccess({
    ...ctx.credential,
    documentName,
  });
  if (!verified) return "session-revoked";

  const wasWritable = !ctx.connectionReadOnly;
  ctx.connectionReadOnly = verified.readOnly;
  ctx.lastSessionCheck = Date.now();
  ctx.nextAccessCheckAt = nextAccessCheckAt(verified);
  return wasWritable && verified.readOnly ? "write-revoked" : "ok";
}

function scheduleGuestRecheck(
  connection: Connection<AuthContext>,
  ctx: AuthContext,
  documentName: string,
) {
  if (ctx.credential.kind !== "guest") return;
  if (ctx.guestRecheckTimer) clearTimeout(ctx.guestRecheckTimer);

  const delay = Math.max(0, ctx.nextAccessCheckAt - Date.now());
  ctx.guestRecheckTimer = setTimeout(async () => {
    try {
      const result = await recheckAccess(ctx, documentName);
      if (result === "session-revoked") {
        connection.close(SESSION_REVOKED);
        return;
      }
      if (result === "write-revoked") {
        // Reconnect so Hocuspocus sends the read-only auth state to the client.
        connection.close(WRITE_REVOKED);
        return;
      }
      scheduleGuestRecheck(connection, ctx, documentName);
    } catch {
      // Internal verification is security-critical: fail closed if it cannot
      // be reached rather than letting a temporary document stay writable.
      connection.close(SESSION_REVOKED);
    }
  }, delay);
}

const server = new Server({
  name: "hocuspocus-synctext",
  port: 1234,

  async onRequest(data: onRequestPayload) {
    const path = data.request.url?.split("?")[0];

    if (path === "/health") {
      data.response.writeHead(200, { "Content-Type": "text/plain" });
      data.response.end("ok");
      // prevent Hocuspocus from sending its default HTTP response
      throw null;
    }

    if (path !== "/internal/restore") return;

    await handleRestoreRequest(data);
    // hocuspocus expects this rejection after we send our own http response
    throw null;
  },

  /*
Runs once, when HTTP connection is upgraded to Websocket and the client sends
its auth message.
The session and guest cookies are carried in the upgrade request headers,
so we parse them there. Hocuspocus's own 'token' is not used.
*/
  async onAuthenticate(data: onAuthenticatePayload) {
    const { documentName, requestHeaders, connectionConfig } = data;

    const cookieHeader = requestHeaders.get("cookie");
    const sessionToken = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
    const guestToken = parseCookie(cookieHeader, GUEST_SESSION_COOKIE_NAME);

    // A signed-in account takes precedence only when it is authorized for this
    // document. If it is not, the browser's still-valid guest document can be
    // used until the normal login claim flow transfers it.
    let credential: AuthCredential | null = null;
    let verified: VerifiedAccess | null = null;
    if (sessionToken) {
      credential = { kind: "user", tokenHash: hashSessionToken(sessionToken) };
      verified = await verifyAccess({ ...credential, documentName });
    }
    if (!verified && guestToken) {
      credential = {
        kind: "guest",
        guestTokenHash: hashGuestSessionToken(guestToken),
      };
      verified = await verifyAccess({ ...credential, documentName });
    }
    if (!verified) throw UNAUTHENTICATED;

    // enforce readOnly at connection level
    connectionConfig.readOnly = verified.readOnly;
    connectionConfig.isAuthenticated = true;

    return {
      credential: credential!,
      actor: verified.actor,
      connectionReadOnly: verified.readOnly,
      lastSessionCheck: Date.now(),
      nextAccessCheckAt: nextAccessCheckAt(verified),
    } satisfies AuthContext;
  },

  // Runs before every inbound message on (each keystroke / update)
  async beforeHandleMessage(data: beforeHandleMessagePayload) {
    const ctx = data.context as AuthContext | undefined;
    if (!ctx) throw UNAUTHENTICATED;

    await lockDocument(data.connection);

    try {
      if (Date.now() < ctx.nextAccessCheckAt) return;

      // revalidate session against the DB (revocation / expiry)
      const result = await recheckAccess(ctx, data.documentName);
      if (result === "session-revoked") throw SESSION_REVOKED;
      if (result === "write-revoked") throw WRITE_REVOKED;
    } catch (error) {
      // afterHandleMessage does not run when this hook rejects the message
      unlockDocument(data.connection);
      throw error;
    }
  },

  async afterHandleMessage(data: afterHandleMessagePayload) {
    unlockDocument(data.connection);
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
    if (Date.now() < ctx.nextAccessCheckAt) return;

    const result = await recheckAccess(ctx, data.documentName);
    const closeEvent =
      result === "session-revoked"
        ? SESSION_REVOKED
        : result === "write-revoked"
          ? WRITE_REVOKED
          : null;
    if (closeEvent) data.connection?.close(closeEvent);
  },

  // Guest documents need an actual timer as well as the request-time checks:
  // otherwise an idle WebSocket could remain connected past a lifecycle
  // boundary and receive stale awareness/content until its next message.
  async connected(data) {
    const ctx = data.context as AuthContext | undefined;
    if (ctx) scheduleGuestRecheck(data.connection, ctx, data.documentName);
  },

  async onDisconnect(data) {
    const ctx = data.context as AuthContext | undefined;
    if (ctx?.guestRecheckTimer) clearTimeout(ctx.guestRecheckTimer);
  },

  // db extension connects hocuspocus's in memory Yjs docs to our persistent Document.ystate storage
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        return loadDocumentState(documentName);
      },
      store: async ({ documentName, state }) => {
        await saveDocumentState(documentName, state);
      },
    }),
  ],
});

server.listen();

function parseCookie(cookie: string | null, name: string): string | null {
  if (!cookie) return null;
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${escapeRegExp(name)}=([^;]*)`),
  );
  return match?.[1] ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
