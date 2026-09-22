import { prisma as db } from "@synctext/db";
import { isAuthorized } from "@/lib/auth/internal";

// Called only by the internal scheduled cleanup container. Deleting the guest
// session cascades to its still-unclaimed temporary document.
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.guestSession.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });

  return Response.json({ ok: true, deleted: result.count });
}
