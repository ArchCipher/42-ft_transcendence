import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import GuestSyncStarter from "./guest-sync-starter";

export const metadata: Metadata = { title: "Sync" };

export default async function SyncPage() {
  const session = await validateSession(await getSessionToken());
  if (!session || !session.user) return <GuestSyncStarter />;
  redirect("/dashboard");
}
