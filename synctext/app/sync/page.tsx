import UserNavbar from "../components/navigation/UserNavbar";
import { SyncEditorPage } from "@/components/sync/sync-editor";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import GuestSyncStarter from "./guest-sync-starter";

export default async function SyncPage() {
  const session = await validateSession(await getSessionToken());
  if (!session || !session.user) return <GuestSyncStarter />;
  return (
    <>
      <UserNavbar username={session.user.username} />
      <SyncEditorPage />
    </>
  );
}
