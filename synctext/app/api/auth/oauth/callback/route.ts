import * as oauth from "oauth4webapi";
import { createSessionForUser } from "@/lib/auth/session-create";
import { OAuthError, exchangeCode, isEnabled } from "@/lib/auth/oauth/identity";
import { consumeTransaction } from "@/lib/auth/oauth/transaction";
import { linkAccount, signInOrCreate } from "@/lib/auth/oauth/account";
import {
  accountKey,
  accountLimiter,
  clientIp,
  ipKey,
  ipLimiter,
} from "@/lib/auth/rate-limit";

/*
GET /api/auth/oauth/callback

The order of operations below IS the security property:

  1. consume the `state` transaction, atomically, on every path
  2. exchange the code
  3. touch database and issue the session
*/

function fail(
  request: Request,
  code: string,
  path: "/auth" | "/profile" = "/auth",
): Response {
  return Response.redirect(new URL(`${path}?error=${code}`, request.url));
}

export async function GET(request: Request) {
  if (!isEnabled())
    return Response.json({ error: "Not enabled" }, { status: 404 });

  const params = new URL(request.url).searchParams;

  const state = params.get("state");
  if (!state) return fail(request, "invalid_state");

  let purpose: "SIGN_IN" | "LINK" | null = null;
  try {
    const transaction = await consumeTransaction(state);
    purpose = transaction.purpose;

    const clientAddress = clientIp(request);
    if ((await ipLimiter.blockedRemaining(ipKey(clientAddress))) > 0)
      return fail(request, "too_many_attempts");

    const identity = await exchangeCode({
      requestUrl: request.url,
      state,
      codeVerifier: transaction.codeVerifier,
      expectedNonce: transaction.nonce,
    });
    const linkUserId = transaction.userId;
    const emailKey = accountKey(identity.email);

    if ((await accountLimiter.blockedRemaining(emailKey)) > 0)
      return fail(request, "too_many_attempts");

    if (transaction.purpose === "LINK") {
      if (!linkUserId) return fail(request, "invalid_state");
      await linkAccount(linkUserId, identity);
      return Response.redirect(new URL("/profile?linked=google", request.url));
    }

    const userId = await signInOrCreate(identity);
    await accountLimiter.clear(emailKey);
    const redirectTo = await createSessionForUser(userId, {
      ip: clientAddress,
      userAgent: request.headers.get("user-agent"),
    });

    return Response.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    if (error instanceof oauth.AuthorizationResponseError) {
      return fail(request, "denied");
    }
    if (error instanceof OAuthError) {
      console.error("[oauth] callback failed", error.code, error.message);
      return fail(
        request,
        error.code,
        purpose === "LINK" ? "/profile" : "/auth",
      );
    }

    console.error("[oauth] callback failed", error);
    return fail(request, "invalid_code");
  }
}
