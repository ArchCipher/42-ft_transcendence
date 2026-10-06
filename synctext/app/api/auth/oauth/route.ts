import { getSessionToken, validateSession } from "@/lib/auth/session";
import { clientIp, ipKey, ipLimiter } from "@/lib/auth/rate-limit";
import { oauthStartSchema } from "@/lib/auth/validation";
import { buildAuthorizationUrl, isEnabled } from "@/lib/auth/oauth/identity";
import { createTransaction } from "@/lib/auth/oauth/transaction";

/*
GET /api/auth/oauth?purpose=signin|link

Opens the authorization request and 302s to the provider.
The caller only controlls `purpose`, which must be "sign-in" or "link".
*/

export async function GET(request: Request) {
  if (!isEnabled())
    return Response.json({ error: "Not enabled" }, { status: 404 });

  const ip = clientIp(request);
  if ((await ipLimiter.blockedRemaining(ipKey(ip))) > 0)
    return Response.json({ error: "Too many attempts" }, { status: 429 });

  // Unknown parameters are dropped rather than rejected
  const parsed = oauthStartSchema.safeParse({
    purpose: new URL(request.url).searchParams.get("purpose") ?? undefined,
  });
  if (!parsed.success)
    return Response.json({ error: "Invalid request" }, { status: 400 });

  const { purpose } = parsed.data;

  let userId: string | null = null;
  if (purpose === "link") {
    const session = await validateSession(await getSessionToken());
    if (!session)
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    userId = session.user.id;
  }

  const { state, nonce, codeChallenge } = await createTransaction({
    purpose: purpose === "link" ? "LINK" : "SIGN_IN",
    userId,
  });

  // redirect to google
  const target = await buildAuthorizationUrl({ state, nonce, codeChallenge });
  return Response.redirect(target);
}
