// Cookie name must match across both synctext and collab
export const SESSION_COOKIE_NAME = "session";

// Guest sessions are browser-scoped, temporary, and intentionally separate
// from authenticated sessions so their cookie can be cleared independently.
export const GUEST_SESSION_COOKIE_NAME = "guest_session";

// Session lifetime in seconds
// cookie `maxAge` and DB `expiresAt` both should use this
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// A guest may edit for thirty minutes, then has a five-minute read-only window
// to sign in and claim the document.
export const GUEST_EDIT_TTL_MS = 30 * 60 * 1000;
export const GUEST_CLAIM_GRACE_MS = 5 * 60 * 1000;
export const GUEST_SESSION_TTL_MS = GUEST_EDIT_TTL_MS + GUEST_CLAIM_GRACE_MS;
export const GUEST_SESSION_TTL_SECONDS = GUEST_SESSION_TTL_MS / 1000;

// Sesssion idle timeout/logout: 2hrs of no activity
export const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2hr

// How often to refresh lastUsed once active
export const SESSION_LAST_USED_UPDATE_THRESHOLD = 30 * 60 * 1000; // 30mins

// Encoded as base-64 data URL, so N-byte image is a ~1.37 * N byte request body.
export const AVATAR_MAX_BYTES = 500 * 1024;

// allow-listed avatar formats
export const AVATAR_MIME_TYPES: readonly string[] = ["image/png", "image/jpeg"];
export const USERNAME_MAX = 32;

// A user is online when they have recently interacted with a visible,
// authenticated application page. This is deliberately independent from the
// much longer session idle timeout.
export const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000; // 2mins
