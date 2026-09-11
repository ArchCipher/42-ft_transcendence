import DashboardClient from "./dashboard-client";
import { requireSession } from "@/lib/auth/guard";
import { SessionGuard } from "@/hooks/use-session-guard";
import './Dashboard.css';

export default async function DashboardPage() {
  const session = await requireSession();

  return (
	<SessionGuard>
		<DashboardClient username={session.user.username}/>
	</SessionGuard>
  );
}
