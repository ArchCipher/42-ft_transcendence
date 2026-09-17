import { timingSafeEqual } from "node:crypto";

// authenticate internal service requests using the shared service token
export function isAuthorized(request: Request) {
  const token = request.headers.get("x-internal-service-token");
  const expected = process.env.INTERNAL_SERVICE_TOKEN;

  if (!expected || !token) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
