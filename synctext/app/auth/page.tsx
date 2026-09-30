import { getSessionToken, validateSession } from "@/lib/auth/session";
import "./auth.css";
import LoginForm from "./login-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";
import UserNavbar from "../components/navigation/UserNavbar";
import StatusNotice from "../components/form/StatusNotice";

// NOTICES displayed in navtab
type Notice = { message: string, role: "status" | "alert" };

const NOTICES: Record<string, Notice | undefined> = {
  pending: {message: "Verification email sent. Check your inbox.", role: "status"},
  "reset-sent": {message: "Password reset email sent. Check your inbox.", role: "status"},
  "reset-done": {message: "Password reset successful!", role: "status"},
  "logged-out": {message: "You have been logged out.", role: "status"},
  // OAuth callback failures. See OAuthErrorCode
  denied: {message: "Google login cancelled.", role: "alert"},
  invalid_state: {message: "That login expired. Please try again.", role: "alert"},
  invalid_code: {message: "Google login failed. Please try again.", role: "alert"},
  invalid_id_token: {message: "Google login failed. Please try again.", role: "alert"},
  account_exists: {message: "An account already uses that email. Log in with your password.", role: "alert"},
  link_conflict: {message: "That google account is linked to another user.", role: "alert"},
  not_enabled: {message: "Google login isn't available.", role: "alert"},
  last_method: {message: "Set a password before removing this sign-in method.", role: "alert"},
  too_many_attempts: {message: "Too many attempts. Please try again later.", role: "alert"},
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string; error?: string }>;
}) {
  const { verify, error } = await searchParams;
  const notice = NOTICES[error ?? verify ?? ""];
  const session = await validateSession(await getSessionToken());
  return (
    <LoginPage
      notice={notice}
      navbar={
        session?.user ? (
          <UserNavbar username={session.user.username} avatarUrl={session.user.avatarUrl} />
        ) : undefined
      }
    />
  );
}

function LoginPage({
  notice,
  navbar,
}: {
  notice?: Notice;
  navbar?: React.ReactNode;
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
      <LoginForm />
    </AuthPageShell>
  );
}
