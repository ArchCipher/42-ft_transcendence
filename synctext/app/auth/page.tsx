import { getSessionToken, validateSession } from "@/lib/auth/session";
import "./auth.css";
import LoginForm from "./login-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";
import UserNavbar from "../components/navigation/UserNavbar";
import StatusNotice from "../components/form/StatusNotice";
import { isEnabled } from "@/lib/auth/oauth/identity";
import { OAUTH_ERROR_MESSAGES, type OAuthErrorCode } from "@/lib/auth/oauth/errors";

const NOTICES: Record<string, string> = {
  pending: "Verification email sent. Check your inbox.",
  "reset-sent": "Password reset email sent. Check your inbox.",
  "reset-done": "Password reset successful!",
  "logged-out": "You have been logged out.",
};

type Notice = { message: string; role: "status" | "alert" };

function resolveNotice(error?: string, verify?: string): Notice | undefined {
  const message = error
    ? OAUTH_ERROR_MESSAGES[error as OAuthErrorCode]
    : undefined;
  if (typeof message === "string") return { message, role: "alert" };
  const text = NOTICES[error ?? verify ?? ""];
  return text ? { message: text, role: "status" } : undefined;
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string; error?: string }>;
}) {
  const { verify, error } = await searchParams;
  const notice = resolveNotice(error, verify);
  const session = await validateSession(await getSessionToken());
  return (
    <LoginPage
      notice={notice}
      oauthEnabled={isEnabled()}
      navbar={
        session?.user ? (
          <UserNavbar
            username={session.user.username}
            avatarUrl={session.user.avatarUrl}
          />
        ) : undefined
      }
    />
  );
}

function LoginPage({
  notice,
  navbar,
  oauthEnabled,
}: {
  notice?: Notice;
  navbar?: React.ReactNode;
  oauthEnabled: boolean;
}) {
  return (
    <AuthPageShell
      navbar={navbar}
      notice={
        notice ? (
          <StatusNotice role={notice.role}>{notice.message}</StatusNotice>
        ) : undefined
      }
    >
      <LoginForm oauthEnabled={oauthEnabled} />
    </AuthPageShell>
  );
}
