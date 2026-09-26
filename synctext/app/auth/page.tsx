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
          <UserNavbar username={session.user.username} />
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
