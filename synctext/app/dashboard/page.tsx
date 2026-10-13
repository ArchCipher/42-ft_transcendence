import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";
import { requireSession } from "@/lib/auth/guard";
import { SessionGuard } from "@/hooks/use-session-guard";
import "./Dashboard.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <SessionGuard>
      <DashboardClient
        userId={session.user.id}
        username={session.user.username}
        avatarUrl={session.user.avatarUrl}
      />
    </SessionGuard>
  );
}
