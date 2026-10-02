import "server-only";

import { PRESENCE_TIMEOUT_MS } from "@synctext/shared";

export function isOnline(lastSeenAt: Date | null, now = Date.now()): boolean {
  return lastSeenAt !== null && now - lastSeenAt.getTime() < PRESENCE_TIMEOUT_MS;
}
