# SyncText Public API

SyncText exposes a public HTTP API for creating and managing collaborative documents. Clients can start a temporary document without an account, retrieve and update its metadata using a secure session token, and retain it by signing in before it expires. Account sessions extend access to persistent documents, group permissions, and explicit deletion.

The API uses JSON request and response bodies, standard HTTP methods and status codes, and opaque tokens delivered through cookies. Document access is checked against the token on each request.

## Base URL and conventions

All public routes live under `/api` on the SyncText application origin. The default local Docker deployment uses:

```text
https://localhost:8443/api
```

Use your deployment's HTTPS origin in production. Send `Content-Type: application/json` for JSON bodies. Resource identifiers are opaque strings; timestamps are ISO 8601 UTC strings. Examples below use illustrative identifiers and timestamps.

Document endpoints return metadata and permissions. Live document text is synchronized through the collaboration service rather than a JSON field in these responses.

## Secure token access

SyncText issues a cryptographically random, 256-bit session token. The token is the client's access credential: keep it private and include its cookie on subsequent requests.

| Credential | Issued by | Access |
| --- | --- | --- |
| `guest_session` cookie | `POST /api/guest-documents` | The temporary document associated with that guest session |
| `session` cookie | Successful account sign-in | Documents and operations permitted by the user's group membership and editor grants |

Tokens are encoded as base64url strings. Only their SHA-256 hashes are stored in the database. Cookies use `HttpOnly`, `SameSite=Lax`, and `Path=/`; production cookies also use `Secure` so they travel over HTTPS. The credential is delivered through `Set-Cookie`, rather than in the JSON response body.

HTTP clients can use a cookie jar to receive and replay the token. Browsers send cookies automatically on same-origin requests. The documented authentication transport is the cookie; clients do not need an API-key header.

A valid account session takes precedence over a guest session when both cookies are present. Account sessions have a seven-day maximum lifetime, a two-hour inactivity timeout, and can be revoked. Reading document endpoints does not itself refresh account activity.

## Quick start: create, read, and rename

Set the application origin and create a temporary document. The first request saves the issued guest credential in a cookie jar:

```bash
BASE_URL="https://your-synctext-host.example"

curl --cookie-jar synctext.cookies \
  --request POST \
  "$BASE_URL/api/guest-documents"
```

Successful creation returns `201 Created`:

```json
{
  "id": "document-id",
  "title": "Untitled Document",
  "mode": "EDITABLE",
  "editExpiresAt": "2026-10-09T12:30:00.000Z",
  "expiresAt": "2026-10-09T12:35:00.000Z"
}
```

Use the returned `id` to retrieve the document:

```bash
DOCUMENT_ID="document-id"

curl --cookie synctext.cookies \
  "$BASE_URL/api/documents/$DOCUMENT_ID"
```

Rename it while its editing window is open:

```bash
curl --cookie synctext.cookies \
  --request PATCH \
  --header 'Content-Type: application/json' \
  --data '{"title":"My first SyncText document"}' \
  "$BASE_URL/api/documents/$DOCUMENT_ID"
```

Treat the cookie jar as a secret: possession of a valid token grants its associated access.

## Endpoint reference

| Method | Path | Operation | Credential |
| --- | --- | --- | --- |
| POST | `/api/guest-documents` | Create or resume a temporary document | None to create; guest token to resume |
| GET | `/api/documents/{id}` | Retrieve document metadata and permissions | Guest or account token |
| PATCH | `/api/documents/{id}` | Rename a document | Editable guest token or account editor |
| GET | `/api/documents` | List accessible persistent documents | Account token |
| POST | `/api/documents` | Create a persistent document | Account token |
| DELETE | `/api/documents/{id}` | Permanently delete a persistent document | Account editor |
| GET | `/api/documents/{id}/grants` | List group members and their editing permissions | Account group member |
| PUT | `/api/documents/{id}/grants/{userId}` | Grant document editing permission | Account editor |
| DELETE | `/api/documents/{id}/grants/{userId}` | Revoke document editing permission | Account editor |

### POST `/api/guest-documents`

Creates one temporary document and its guest session. No request body or account is required. The response sets the `guest_session` cookie and returns the document ID, title, current mode, editing deadline, and expiration deadline.

When the client already has an active guest session with a document, the endpoint resumes that document with `200 OK`. Resuming preserves the original deadlines. Creating a new guest document returns `201 Created`.

New-session creation is rate limited by client IP. Exceeding the quota returns `429 Too Many Requests`:

```json
{ "error": "Too many temporary documents from this network" }
```

### GET `/api/documents/{id}`

Returns `200 OK` for a document accessible to the supplied token. A guest token can access only its own temporary document; account access requires membership in the document's group.

Guest response:

```json
{
  "id": "document-id",
  "title": "My first SyncText document",
  "createdAt": "2026-10-09T12:00:00.000Z",
  "updatedAt": "2026-10-09T12:01:00.000Z",
  "groupId": null,
  "createdBy": null,
  "canRename": true,
  "canDelete": false,
  "guest": {
    "mode": "EDITABLE",
    "editExpiresAt": "2026-10-09T12:30:00.000Z",
    "expiresAt": "2026-10-09T12:35:00.000Z"
  }
}
```

Account document response:

```json
{
  "id": "document-id",
  "title": "Project notes",
  "createdAt": "2026-10-09T12:00:00.000Z",
  "updatedAt": "2026-10-09T12:01:00.000Z",
  "groupId": "group-id",
  "createdBy": { "id": "user-id", "username": "alex" },
  "canEdit": true
}
```

`createdBy` may be `null`. For guests, `canRename` becomes `false` during the read-only window. For account documents, `canEdit` indicates permission to edit, rename, delete, and manage editor grants.

### PATCH `/api/documents/{id}`

Updates the document title and returns `200 OK` with the updated document response.

```json
{ "title": "Updated document title" }
```

The title must be a string containing between 1 and 120 characters after trimming. Missing or invalid titles return `400 Bad Request`. Account callers need editing permission. Guests may rename their document only before `editExpiresAt`; later attempts return `403 Forbidden`:

```json
{ "error": "Temporary documents are read-only after 30 minutes" }
```

### GET `/api/documents`

Returns `200 OK` with an array of account document summaries, ordered by most recently updated first. The list includes documents in all groups the user belongs to, including their private space. An empty list is returned as `[]`.

### POST `/api/documents`

Creates a persistent document titled `Untitled Document`. Supply an optional group ID:

```json
{ "groupId": "group-id" }
```

Sending `{}` creates the document in the user's private space. The caller must belong to the selected group. The creator receives an editor grant. Success returns `201 Created` with the account document summary.

A non-string `groupId` returns `400 Bad Request`. A group unavailable to the caller returns `404 Not Found`.

### DELETE `/api/documents/{id}`

Permanently deletes a persistent document. The caller must have editing permission. Related snapshots and editor grants are removed through database cascades. Success returns `204 No Content` with an empty body.

```bash
curl --cookie synctext.cookies \
  --request DELETE \
  "$BASE_URL/api/documents/$DOCUMENT_ID"
```

Guest documents use automatic expiration and deletion, described below. A guest calling this endpoint receives `404 Not Found`.

### GET `/api/documents/{id}/grants`

Returns `200 OK` with the document's group members and their editing permissions. Any account member of the group can read this list. Members are ordered by role: owner, admins, then members.

```json
[
  {
    "userId": "user-id",
    "username": "alex",
    "avatarUrl": null,
    "role": "OWNER",
    "canEdit": true
  }
]
```

### PUT `/api/documents/{id}/grants/{userId}`

Grants editing permission on a document to an existing member of its group. The caller must be an editor. No request body is required.

```bash
TARGET_USER_ID="group-member-id"

curl --cookie synctext.cookies \
  --request PUT \
  "$BASE_URL/api/documents/$DOCUMENT_ID/grants/$TARGET_USER_ID"
```

Returns `204 No Content`, including when the grant already exists. A target outside the group returns `404 Not Found`. The group owner always has editing permission; attempts to change the owner's grant return `409 Conflict`.

### DELETE `/api/documents/{id}/grants/{userId}`

Removes an editor grant, returning the target member to viewer access. The caller must be an editor and may revoke their own grant. No request body is required. Returns `204 No Content`, including when the grant is already absent. The same target membership and owner restrictions apply as for `PUT`.

## Temporary document lifecycle and automatic deletion

Temporary documents have a complete server-managed lifecycle:

| Time from creation | State | Available actions |
| --- | --- | --- |
| First 30 minutes | `EDITABLE` | Read, edit in the collaborative editor, rename, or claim on sign-in |
| Next five minutes | `READ_ONLY` | Read and claim on sign-in |
| At 35 minutes | Expired | Guest token access ends; an unclaimed document becomes eligible for deletion |

The response's `editExpiresAt` and `expiresAt` are the authoritative deadlines. Repeating the creation request does not extend them.

**Unclaimed documents are deleted automatically.** The scheduled cleanup removes expired guest sessions, and database cascades remove their associated temporary documents and dependent records. The default Docker deployment runs cleanup on a five-minute loop. Access ends at expiration; physical deletion follows a successful cleanup pass.

Signing in with a verified account before expiration claims the temporary document when the account's private space is available. The document is transferred to that space, detached from its guest session, and preserved beyond the temporary deadline. Subsequent access uses the account token and normal document permissions.

Cleanup is an internal maintenance operation. Public clients rely on the lifecycle deadlines and do not need to invoke a cleanup endpoint.

## Account access

Clients with an existing, verified password account can obtain an account token through `POST /api/auth/login`. Use the same cookie jar to claim an active temporary document during sign-in:

```bash
curl --cookie synctext.cookies \
  --cookie-jar synctext.cookies \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{"email":"alex@example.com","password":"your-password"}' \
  "$BASE_URL/api/auth/login"
```

Success returns `200 OK` with `{ "ok": true, "redirectTo": "..." }` and sets the `session` cookie. Invalid credentials return `401 Unauthorized`; an unverified email returns `403 Forbidden`. The `redirectTo` field identifies the claimed document page or the dashboard.

## Rate limiting

The API applies quotas to guest-session creation and account authentication:

| Operation | Limit | Response when limited |
| --- | --- | --- |
| New guest-session creation | 10 creation attempts per client IP in a rolling hour | `429` |
| Login failures by IP | 10 failures in 15 minutes trigger a 15-minute lockout | `429` on requests during lockout |
| Login failures by account | 20 failures in 15 minutes trigger a 15-minute lockout | `429` on requests during lockout |

Login and registration share authentication failure buckets. A successful login clears the corresponding IP and account failure counters. Resuming an existing guest document does not consume the new-session creation quota.

These limits use in-memory counters per application process and reset on restart. Document read, rename, deletion, and grant routes do not currently have a separate request quota. Rate-limit responses contain a JSON error; they do not advertise a `Retry-After` header. Clients should back off after `429` rather than retry continuously.

## Errors and permissions

Document and grant endpoint errors use this shape:

```json
{ "error": "Document not found" }
```

| Status | Meaning |
| --- | --- |
| `200 OK` | Resource read, updated, or resumed successfully |
| `201 Created` | A new document was created |
| `204 No Content` | Deletion or grant change completed; response body is empty |
| `400 Bad Request` | Invalid request fields |
| `401 Unauthorized` | Missing, invalid, expired, or revoked credential |
| `403 Forbidden` | Caller can access the resource but cannot perform the operation |
| `404 Not Found` | Resource does not exist or is outside the caller's permitted scope |
| `409 Conflict` | Requested grant change conflicts with the owner's permanent editing rights |
| `429 Too Many Requests` | Creation quota or authentication lockout applies |

Group members can read their group's documents. The group owner can edit by default; other members, including admins, need a document editor grant. Resources outside the caller's scope return `404` to preserve their privacy.
