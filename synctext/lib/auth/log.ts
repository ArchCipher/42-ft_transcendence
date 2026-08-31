import { createHash } from "node:crypto";

// Hash PII for logs
export function hashForLog(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
