import { getSessionToken, validateSession } from "@/lib/auth/session";
import { parseRequest } from "@/lib/auth/parse-request";
import { oauthUnlinkSchema } from "@/lib/auth/validation";
import { OAuthError } from "@/lib/auth/oauth/identity";
import { unlinkAccount } from "@/lib/auth/oauth/account";
import { clientIp, ipKey, ipLimiter } from "@/lib/auth/rate-limit";

/*
POST /api/auth/oauth/unlink   body: { provider: "google" }

Response: 200 { ok: true } | 400 { error } | 401 { error } | 415 | 500
*/

export async function POST(request: Request) {
  const session = await validateSession(await getSessionToken());
  if (!session)
    return Response.json({ error: "Not authenticated" }, { status: 401 });

  if ((await ipLimiter.blockedRemaining(ipKey(clientIp(request)))) > 0)
    return Response.json({ error: "last_method" }, { status: 429 });

  const result = await parseRequest(request, oauthUnlinkSchema);
  if (result.error) return result.error;

  try {
    await unlinkAccount(session.user.id, result.data.provider);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof OAuthError) {
      if (error.code === "last_method")
        return Response.json({ error: error.code }, { status: 409 });
      return Response.json({ error: error.code }, { status: 400 });
    }
    console.error("[oauth] unlink failed", error);
    return Response.json({ error: "Unlink failed" }, { status: 500 });
  }
}
