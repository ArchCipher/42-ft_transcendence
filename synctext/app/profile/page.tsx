import type { Metadata } from "next";

import ProfileClient from "./profile-client";

import { requireSession } from "@/lib/auth/guard";
import { SessionGuard } from "@/hooks/use-session-guard";

import { prisma as db } from "@synctext/db";
import { isEnabled } from "@/lib/auth/oauth/identity";
import { OAUTH_ERROR_MESSAGES, type OAuthErrorCode } from "@/lib/auth/oauth/errors";

export const metadata: Metadata = { title: "Profile" };

type Notice = { text: string; kind: "saved" | "error" };

const LINK_NOTICES: Record<string, Notice> = {
  linked: { text: "Google account linked.", kind: "saved" },
};

function resolveNotice(error?: string, linked?: string): Notice | null {
  const message = error
    ? OAUTH_ERROR_MESSAGES[error as OAuthErrorCode]
    : undefined;
  if (typeof message === "string") return { text: message, kind: "error" };
  return LINK_NOTICES[linked ?? ""] ?? null;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string; error?: string }>;
}) {
  const { user } = await requireSession();
  const { linked, error } = await searchParams;
  const googleAccount = await db.oAuthAccount.findFirst({
    where: { userId: user.id, provider: "google" },
    select: { id: true },
  });

  return (
    <SessionGuard>
      <ProfileClient
        oauthEnabled={isEnabled()}
        googleLinked={googleAccount !== null}
        initialNotice={resolveNotice(error, linked)}
        initial={{
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          hasPassword: user.passwordHash !== null,
        }}
      />
    </SessionGuard>
  );
}
