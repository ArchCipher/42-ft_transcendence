import { redirect } from "next/navigation";
import {
  getSessionToken,
  validateSession,
} from "@/lib/auth/session";
import type { Session, User } from "@synctext/db";

/*
validateSession,
if session expired - logout + redirect to login page

NOTE: read-only on purpose.
Cookie writes are legal only from route handler, a server action or a proxy
response - never during server render, where cookies() is a read-only store and
.delete() throws.
*/
export async function requireSession(): Promise<Session & { user: User }> {
  const token = await getSessionToken();
  const session = await validateSession(token);

  if (!session?.user?.id) {
    redirect(token ? "/api/auth/logout" : "/auth");
  }
  return session;
}
