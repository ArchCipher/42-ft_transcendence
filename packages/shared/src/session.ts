import {createHash} from "node:crypto";

// Hash shared by every service so DB leak never yields usable sessions
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
