const webUrl = requireEnv("WEB_INTERNAL_URL");
export const internalToken = requireEnv("INTERNAL_SERVICE_TOKEN");
const REQUEST_TIMEOUT_MS = 10000;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

export async function verifySession(data: {
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Failed to verify session: ${response.status}`);

  const body = await response.json();
  if (!body.valid) return null;
  return body as { userId: string; readOnly: boolean };
}

export async function loadDocumentState(documentName: string) {
  const response = await fetch(
    `${webUrl}/api/internal/documents/${encodeURIComponent(documentName)}/state`,
    {
      headers: { "x-internal-service-token": internalToken },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) throw new Error(`Failed to load document: ${response.status}`);
  if (response.status === 204) return null;
  return new Uint8Array(await response.arrayBuffer());
}

export async function saveDocumentState(documentName: string, state: Uint8Array) {
  const response = await fetch(
    `${webUrl}/api/internal/documents/${encodeURIComponent(documentName)}/state`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/octet-stream",
        "x-internal-service-token": internalToken,
      },
      body: new Uint8Array(state),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) throw new Error(`Failed to store document: ${response.status}`);
}

export async function saveRecoverySnapshot(documentName: string, state: Uint8Array) {
  const response = await fetch(
    `${webUrl}/api/internal/documents/${encodeURIComponent(documentName)}/snapshots`,
    {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "x-internal-service-token": internalToken,
      },
      body: new Uint8Array(state),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) throw new Error(`Failed to save recovery snapshot: ${response.status}`);

  const snapshot = await response.json();
  if (typeof snapshot.id !== "string") throw new Error("Missing recovery snapshot id");
  return snapshot.id as string;
}
