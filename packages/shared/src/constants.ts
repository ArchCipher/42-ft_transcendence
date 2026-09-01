// Cookie name must match across both synctext and collab
export const SESSION_COOKIE_NAME = "session";

// Session lifetime in seconds
// cookie `maxAge` and DB `expiresAt` both should use this
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Sesssion idle timeout/logout: 2hrs of no activity
export const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2hr

// How often to refresh lastUsed once active
export const SESSION_LAST_USED_UPDATE_THRESHOLD = 30 * 60 * 1000; // 30mins
