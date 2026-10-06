import "server-only";

import { createHash } from "node:crypto";
import { prisma as db } from "@synctext/db";
import * as oauth from "oauth4webapi";
import { OAuthError } from "./identity";

/*
Persistence for an auth request between `start` and `callback`.

NOTE: `codeVerifier`, is not hashed during storage as it must be recoverable to
redeem the code. It is single-use, consumed atomically, so its plaintext lifetime
is bounded(10 minutes) and short.
*/
const TRANSACTION_TTL_MS = 10 * 60 * 1000;

function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export async function createTransaction(input: {
  purpose: "SIGN_IN" | "LINK";
  userId: string | null;
}): Promise<{ state: string; nonce: string; codeChallenge: string }> {
  const state = oauth.generateRandomState();
  const nonce = oauth.generateRandomNonce();
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);

  // Reclaim rows whose ten minutes are up.
  await db.oAuthTransaction.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  await db.oAuthTransaction.create({
    data: {
      stateHash: hashState(state),
      codeVerifier,
      nonce,
      purpose: input.purpose,
      userId: input.userId,
      expiresAt: new Date(Date.now() + TRANSACTION_TTL_MS),
    },
  });

  return { state, nonce, codeChallenge };
}

/*
Claim a transaction exactly once.

Called before the authorization code is touched, on every path including the
user cancelling consent, so a state can never be replayed even on failure.
*/
export async function consumeTransaction(state: string): Promise<{
  codeVerifier: string;
  nonce: string;
  purpose: "SIGN_IN" | "LINK";
  userId: string | null;
}> {
  const stateHash = hashState(state);
  const row = await db.oAuthTransaction.findUnique({ where: { stateHash } });

  if (!row)
    throw new OAuthError("invalid_state", "no transaction for this state");

  if (row.usedAt !== null || row.expiresAt < new Date()) {
    // Delete once expired or spent
    await db.oAuthTransaction
      .delete({ where: { stateHash } })
      .catch((error) =>
        console.error("[oauth] transaction cleanup failed", error),
      );
    throw new OAuthError("invalid_state", "transaction is spent or expired");
  }

  const { count } = await db.oAuthTransaction.updateMany({
    where: { stateHash, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (count !== 1)
    throw new OAuthError("invalid_state", "transaction already consumed");

  return {
    codeVerifier: row.codeVerifier,
    nonce: row.nonce,
    purpose: row.purpose,
    userId: row.userId,
  };
}
