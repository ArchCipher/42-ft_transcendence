import "server-only";

import * as oauth from "oauth4webapi";
import type { OAuthErrorCode } from "./errors";
import { appUrl, requiredEnv } from "@/lib/env";

export const PROVIDER = "google";

// [Google's endpoints](https://accounts.google.com/.well-known/openid-configuration)
const ISSUER = new URL("https://accounts.google.com");
const MAX_SUBJECT_LENGTH = 255;

/*
`code` is safe to hand a user as a query parameter.
`message` is for the server log only.
*/
export class OAuthError extends Error {
  constructor(
    readonly code: OAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export function isEnabled(): boolean {
  return process.env.GOOGLE_OAUTH_ENABLED === "true";
}

// Must match a registered redirect URI byte for byte.
export function redirectUri(): string {
  return appUrl("/api/auth/oauth/callback");
}

function client(): oauth.Client {
  return { client_id: requiredEnv("GOOGLE_CLIENT_ID") };
}

function clientAuth(): oauth.ClientAuth {
  return oauth.ClientSecretPost(requiredEnv("GOOGLE_CLIENT_SECRET"));
}

// ---- discovery -------------------------------------------------------------

// The discovery document changes rarely -> cache it in module scope for an hour
const DISCOVERY_TTL_MS = 60 * 60 * 1000;
let cachedServer: { as: oauth.AuthorizationServer; at: number } | null = null;

export async function authorizationServer(): Promise<oauth.AuthorizationServer> {
  const now = Date.now();
  if (cachedServer && now - cachedServer.at < DISCOVERY_TTL_MS)
    return cachedServer.as;

  const response = await oauth.discoveryRequest(ISSUER, { algorithm: "oidc" });
  const as = await oauth.processDiscoveryResponse(ISSUER, response);
  cachedServer = { as, at: now };
  return as;
}

// ---- authorization request -------------------------------------------------

/*
Build url to send to user.

List of auth params:
https://developers.google.com/identity/protocols/oauth2/web-server
*/
export async function buildAuthorizationUrl(input: {
  state: string;
  nonce: string;
  codeChallenge: string;
}): Promise<string> {
  const as = await authorizationServer();

  const url = new URL(as.authorization_endpoint!);
  url.searchParams.set("client_id", requiredEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

// ---- callback --------------------------------------------------------------

export type VerifiedIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
};

/*
Exchange code for identity.
*/
export async function exchangeCode(input: {
  requestUrl: string;
  state: string;
  codeVerifier: string;
  expectedNonce: string;
}): Promise<VerifiedIdentity> {
  const as = await authorizationServer();
  const c = client();

  // Re-check `state`, reject an `error` response, and require `code`
  const params = oauth.validateAuthResponse(
    as,
    c,
    new URL(input.requestUrl),
    input.state,
  );

  // Build + send token request
  const response = await oauth.authorizationCodeGrantRequest(
    as,
    c,
    clientAuth(),
    params,
    redirectUri(),
    input.codeVerifier,
  );
  // verify signature
  const result = await oauth.processAuthorizationCodeResponse(as, c, response, {
    expectedNonce: input.expectedNonce,
    requireIdToken: true,
  });

  const claims = oauth.getValidatedIdTokenClaims(result);
  if (!claims)
    throw new OAuthError("invalid_id_token", "no id token in response");
  if (typeof claims.sub !== "string" || claims.sub.length === 0)
    throw new OAuthError("invalid_id_token", "token carries no subject");
  if (claims.sub.length > MAX_SUBJECT_LENGTH)
    throw new OAuthError("invalid_id_token", "subject exceeds expected length");
  if (typeof claims.email !== "string" || claims.email.length === 0)
    throw new OAuthError(
      "invalid_id_token",
      "provider supplied no email address",
    );
  return {
    subject: claims.sub,
    email: claims.email.trim().toLowerCase(),
    emailVerified: claims.email_verified === true,
  };
}
