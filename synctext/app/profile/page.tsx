import "./Profile.css";
import ProfileForm from "./profile-form";

import UserNavbar from "../components/navigation/UserNavbar";
import { requireSession } from "@/lib/auth/guard";
import AuthPageShell from "../components/auth/AuthPageShell";
import { SessionGuard } from "@/hooks/use-session-guard";

export default async function Profile() {
  const session = await requireSession();

  return (
    <SessionGuard>
      <AuthPageShell navbar={<UserNavbar username={session.user.username} />}>
        <ProfileForm />
      </AuthPageShell>
    </SessionGuard>
  );
}
