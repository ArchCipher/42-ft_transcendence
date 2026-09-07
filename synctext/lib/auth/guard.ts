import { redirect } from "next/navigation";
import {
  getSessionToken,
  validateSession,
  logoutCurrentSession,
} from "@/lib/auth/session";
import type { Session, User } from "@synctext/db";

export async function requireSession(): Promise<Session & { user: User }> {
  const token = await getSessionToken();
  const session = await validateSession(token);

  if (!session?.user?.id) {
    if (token) await logoutCurrentSession();
    redirect(token ? "/auth?verify=logged-out" : "/auth");
  }

  return session;
}
