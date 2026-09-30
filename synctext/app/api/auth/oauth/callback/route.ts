import * as oauth from "oauth4webapi";
import { createSessionForUser } from "@/lib/auth/session-create";
import { OAuthError, exchangeCode, isEnabled } from "@/lib/auth/oauth/identity";
import { consumeTransaction } from "@/lib/auth/oauth/transaction";
import { linkAccount, signInOrCreate } from "@/lib/auth/oauth/account";
import { accountKey, accountLimiter, clientIp } from "@/lib/auth/rate-limit";

/*
GET /api/auth/oauth/callback

The order of operations below IS the security property:

  1. consume the `state` transaction, atomically, on every path
  2. only then look at the authorization `code`
  3. only then exchange it
*/

function fail(request: Request, code: string): Response {
  return Response.redirect(new URL(`/auth?error=${code}`, request.url));
}

export async function GET(request: Request) {
  if (!isEnabled())
    return Response.json({ error: "Not enabled" }, { status: 404 });

  const params = new URL(request.url).searchParams;

  const state = params.get("state");
  if (!state) return fail(request, "invalid_state");

  try {
    const transaction = await consumeTransaction(state);

    const identity = await exchangeCode({
      requestUrl: request.url,
      state,
      codeVerifier: transaction.codeVerifier,
      expectedNonce: transaction.nonce,
    });
    const linkUserId = transaction.userId;

    if ((await accountLimiter.blockedRemaining(accountKey(identity.email))) > 0)
      return fail(request, "too_many_attempts");

    if (transaction.purpose === "LINK") {
      if (!linkUserId) return fail(request, "invalid_state");
      await linkAccount(linkUserId, identity);
      return Response.redirect(new URL("/profile?linked=google", request.url));
    }

    const userId = await signInOrCreate(identity);
    await accountLimiter.clear(accountKey(identity.email));
    const redirectTo = await createSessionForUser(userId, {
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return Response.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    if (error instanceof oauth.AuthorizationResponseError) {
      return fail(request, "denied");
    }
    if (error instanceof OAuthError) {
      console.error("[oauth] callback failed", error.code, error.message);
      return fail(request, error.code);
    }

    console.error("[oauth] callback failed", error);
    return fail(request, "invalid_code");
  }
}
