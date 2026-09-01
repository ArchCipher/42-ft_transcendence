import { redirect } from "next/navigation"
import { getSessionToken, validateSession } from "@/lib/auth/session"
import DashboardClient from "./dashboard-client"

// Auth gate for dashboard (mirrors doc/[id]/page.tsx -> see if can reduce repetition)
export default async function DashboardPage() {
  const session = await validateSession(await getSessionToken())
  if (!session?.user?.id) redirect("/auth")

  return <DashboardClient username={session.user.username} />
}
