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
import { appUrl } from "@/lib/env";

/*
GET /api/auth/oauth/callback

The order of operations below IS the security property:

  1. consume the `state` transaction, atomically, on every path
  2. exchange the code
  3. touch database and issue the session
*/

function fail(
  code: string,
  purpose?: "SIGN_IN" | "LINK" | null,
): Response {
  const path = purpose === "LINK" ? "/profile" : "/auth";
  return Response.redirect(appUrl(`${path}?error=${code}`));
}

export async function GET(request: Request) {
  if (!isEnabled())
    return Response.json({ error: "Not enabled" }, { status: 404 });

  const params = new URL(request.url).searchParams;

  const state = params.get("state");
  if (!state) return fail("invalid_state");

  let purpose: "SIGN_IN" | "LINK" | null = null;
  try {
    const transaction = await consumeTransaction(state);
    purpose = transaction.purpose;

    const clientAddress = clientIp(request);
    if ((await ipLimiter.blockedRemaining(ipKey(clientAddress))) > 0)
      return fail("too_many_attempts", purpose);

    const identity = await exchangeCode({
      requestUrl: request.url,
      state,
      codeVerifier: transaction.codeVerifier,
      expectedNonce: transaction.nonce,
    });
    const linkUserId = transaction.userId;
    const emailKey = accountKey(identity.email);

    if ((await accountLimiter.blockedRemaining(emailKey)) > 0)
      return fail("too_many_attempts", purpose);

    if (transaction.purpose === "LINK") {
      if (!linkUserId) return fail("invalid_state", purpose);
      await linkAccount(linkUserId, identity);
      return Response.redirect(appUrl("/profile?linked=google"));
    }

    const userId = await signInOrCreate(identity);
    await accountLimiter.clear(emailKey);
    const redirectTo = await createSessionForUser(userId, {
      ip: clientAddress,
      userAgent: request.headers.get("user-agent"),
    });

    return Response.redirect(appUrl(redirectTo));
  } catch (error) {
    if (error instanceof oauth.AuthorizationResponseError) {
      return fail("denied", purpose);
    }
    if (error instanceof OAuthError) {
      console.error("[oauth] callback failed", error.code, error.message);
      return fail(error.code, purpose);
    }

    console.error("[oauth] callback failed", error);
    return fail("invalid_code", purpose);
  }
}
