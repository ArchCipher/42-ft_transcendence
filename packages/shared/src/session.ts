import {createHash} from "node:crypto";

// Hash shared by every service so DB leak never yields usable sessions
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Guest tokens use the same one-way SHA-256 storage format as authenticated
// session tokens, but the explicit name prevents callers from mixing actors.
export function hashGuestSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
