import "./auth.css";
import LoginForm from "./login-form";
import AuthPageShell from "@/components/AuthPageShell";

// NOTICES displayed in navtab
const NOTICES: Record<string, string> = {
  "pending": "Verification email sent. Check your inbox.",
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
  return <LoginPage verify={verify} />;
}

function LoginPage({ verify }: { verify?: string }) {
  return (
    <AuthPageShell
      notice={
        verify && NOTICES[verify] ? (
          <div className="AuthNotice" role="status">
            {NOTICES[verify]}
          </div>
        ) : undefined
      }
    >
      <LoginForm />
    </AuthPageShell>
  );
}
