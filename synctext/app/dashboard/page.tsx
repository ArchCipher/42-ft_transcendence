import DashboardClient from "./dashboard-client"
import { requireSession } from "@/lib/auth/guard"

// Auth gate for dashboard (mirrors doc/[id]/page.tsx -> see if can reduce repetition)
export default async function DashboardPage() {
  const session = await requireSession()

  return <DashboardClient username={session.user.username} />
}
