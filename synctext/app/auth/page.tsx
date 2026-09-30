import { getSessionToken, validateSession } from "@/lib/auth/session";
import "./auth.css";
import LoginForm from "./login-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";
import UserNavbar from "../components/navigation/UserNavbar";
import StatusNotice from "../components/form/StatusNotice";

// NOTICES displayed in navtab
const NOTICES: Record<string, string> = {
  pending: "Verification email sent. Check your inbox.",
  "reset-sent": "Password reset email sent. Check your inbox.",
  "reset-done": "Password reset successful!",
  "logged-out": "You have been logged out.",
  // OAuth callback failures. See OAuthErrorCode
  denied: "Google login cancelled.",
  invalid_state: "That login expired. Please try again.",
  invalid_code: "Google login failed. Please try again.",
  invalid_id_token: "Google login failed. Please try again.",
  account_exists: "An account already uses that email. Log in with your password.",
  link_conflict: "That google account is linked to another user.",
  not_enabled: "Google login isn't available.",
  too_many_attempts: "Too many attempts. Please try again later.",
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const { verify } = await searchParams;
  const session = await validateSession(await getSessionToken());
  return (
    <LoginPage
      verify={verify}
      navbar={
        session?.user ? (
          <UserNavbar username={session.user.username} avatarUrl={session.user.avatarUrl} />
        ) : undefined
      }
    />
  );
}

function LoginPage({
  verify,
  navbar,
}: {
  verify?: string;
  navbar?: React.ReactNode;
}) {
  return (
    <AuthPageShell
      navbar={navbar}
      notice={
        verify && NOTICES[verify] ? (
          <StatusNotice>{NOTICES[verify]}</StatusNotice>
        ) : undefined
      }
    >
      <LoginForm />
    </AuthPageShell>
  );
}
