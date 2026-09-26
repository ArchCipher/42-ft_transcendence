import type { Metadata } from "next";

import ProfileClient from "./profile-client";

import { requireSession } from "@/lib/auth/guard";
import { SessionGuard } from "@/hooks/use-session-guard";

export const metadata: Metadata = { title: "Profile — SyncText" };

export default async function ProfilePage() {
  const { user } = await requireSession();

  return (
    <SessionGuard>
      <ProfileClient
        initial={{
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
        }}
      />
    </SessionGuard>
  );
}
