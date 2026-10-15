import { describe, it, expect, vi, beforeEach } from "vitest";

/*
The three OAuth account policies that e2e cannot reach: account_exists,
link_conflict and last_method.

Reaching them through the real provider would require completing an
interactive sign-in at accounts.google.com - a client_id/secret in .env only
makes the START redirect work, Playwright cannot finish the Google side. But
the policies themselves are pure decision logic over a few Prisma reads
(lib/auth/oauth/account.ts): given this subject, this email and this user
row, does sign-in create, link or refuse? That is exactly what a mocked-DB
unit test answers, with no Docker, no Google and no sign-up quota.

The Google-facing halves (start/callback/unlink endpoints, state handling,
the denied-consent redirect) live in e2e 16-oauth.spec.ts.
*/

const mocks = vi.hoisted(() => {
  const user = { findUnique: vi.fn() };
  const oAuthAccount = {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  };
  const db = { user, oAuthAccount, $transaction: vi.fn() };
  const createUserWithPrivateSpace = vi.fn();
  return { user, oAuthAccount, db, createUserWithPrivateSpace };
});

vi.mock("server-only", () => ({}));
vi.mock("@synctext/db", () => ({ prisma: mocks.db }));
vi.mock("../../lib/auth/create-user", () => ({
  createUserWithPrivateSpace: mocks.createUserWithPrivateSpace,
}));

import {
  signInOrCreate,
  linkAccount,
  unlinkAccount,
} from "../../lib/auth/oauth/account";
import { OAuthError, PROVIDER, type VerifiedIdentity } from "../../lib/auth/oauth/identity";
import { USERNAME_MAX } from "@synctext/shared";

const identity: VerifiedIdentity = {
  subject: "google-subject-1",
  email: "sign.in@example.com",
  emailVerified: true,
};

// The policy must refuse WITH an OAuthError carrying the browser-visible
// code - anything else (TypeError, Prisma error, ...) is a bug in the test
// or in the policy, not a pass.
async function policyError(fn: () => Promise<unknown>): Promise<OAuthError> {
  try {
    await fn();
  } catch (err) {
    expect(err).toBeInstanceOf(OAuthError);
    return err as OAuthError;
  }
  throw new Error("expected the policy to refuse, but it resolved");
}

// Both account lookup paths must key on (provider, subject) - never on email.
// Takes the mock itself: mock.calls[0] is the argument TUPLE of the first
// call, so the lookup object is calls[0][0].
function expectSubjectLookup(mock: { mock: { calls: unknown[][] } }) {
  expect(mock.mock.calls[0]?.[0]).toEqual({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER,
        providerAccountId: identity.subject,
      },
    },
    select: { userId: true },
  });
}

beforeEach(() => {
  mocks.user.findUnique.mockReset();
  mocks.oAuthAccount.findUnique.mockReset();
  mocks.oAuthAccount.create.mockReset();
  mocks.oAuthAccount.deleteMany.mockReset();
  mocks.db.$transaction.mockReset();
  mocks.createUserWithPrivateSpace.mockReset();
});

describe("signInOrCreate", () => {
  it("returns the linked user for a returning subject", async () => {
    mocks.oAuthAccount.findUnique.mockResolvedValue({ userId: "u-linked" });

    await expect(signInOrCreate(identity)).resolves.toBe("u-linked");

    expectSubjectLookup(mocks.oAuthAccount.findUnique);
    // no email lookup, no user creation - the subject alone decided
    expect(mocks.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("refuses on email collision (account_exists) instead of matching by email", async () => {
    mocks.oAuthAccount.findUnique.mockResolvedValue(null);
    mocks.user.findUnique.mockResolvedValue({ id: "u-existing" });

    const err = await policyError(() => signInOrCreate(identity));
    expect(err.code).toBe("account_exists");
    expect(mocks.user.findUnique).toHaveBeenCalledWith({
      where: { email: identity.email },
      select: { id: true },
    });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("creates an OAuth-only user with the subject attached", async () => {
    mocks.oAuthAccount.findUnique.mockResolvedValue(null);
    mocks.user.findUnique.mockResolvedValue(null); // no collision, username free
    mocks.db.$transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => fn({}),
    );
    mocks.createUserWithPrivateSpace.mockResolvedValue("u-new");

    await expect(signInOrCreate(identity)).resolves.toBe("u-new");

    expect(mocks.createUserWithPrivateSpace).toHaveBeenCalledTimes(1);
    const data = mocks.createUserWithPrivateSpace.mock.calls[0]![1];
    expect(data).toMatchObject({
      email: identity.email,
      // never a password: this account can only sign in through Google
      // until the user explicitly sets one
      passwordHash: null,
      emailVerifiedAt: expect.any(Date),
      accounts: {
        create: {
          provider: PROVIDER,
          providerAccountId: identity.subject,
          emailAtLinkTime: identity.email,
        },
      },
    });
    expect(data.username).toMatch(/^signin_[0-9a-f]+$/);
    expect((data.username as string).length).toBeLessThanOrEqual(USERNAME_MAX);
    // one email probe + one availability probe
    expect(mocks.user.findUnique).toHaveBeenCalledTimes(2);
  });

  it("stores a null verified timestamp when the provider did not verify", async () => {
    mocks.oAuthAccount.findUnique.mockResolvedValue(null);
    mocks.user.findUnique.mockResolvedValue(null);
    mocks.db.$transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => fn({}),
    );
    mocks.createUserWithPrivateSpace.mockResolvedValue("u-new");

    await signInOrCreate({ ...identity, emailVerified: false });

    const data = mocks.createUserWithPrivateSpace.mock.calls[0]![1];
    expect(data.emailVerifiedAt).toBeNull();
  });

  it("falls back to a 'user_' seed when the local part has no usable characters", async () => {
    mocks.oAuthAccount.findUnique.mockResolvedValue(null);
    mocks.user.findUnique.mockResolvedValue(null);
    mocks.db.$transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => fn({}),
    );
    mocks.createUserWithPrivateSpace.mockResolvedValue("u-new");

    await signInOrCreate({ ...identity, email: "...@example.com" });

    const data = mocks.createUserWithPrivateSpace.mock.calls[0]![1];
    expect(data.username).toMatch(/^user_[0-9a-f]+$/);
  });

  it("gives up after 8 username probes (invalid_id_token)", async () => {
    mocks.oAuthAccount.findUnique.mockResolvedValue(null);
    // email lookup returns null, every username candidate is taken
    mocks.user.findUnique.mockImplementation(
      async (args: { where: { email?: string } }) =>
        args.where.email === undefined ? { id: "taken" } : null,
    );

    const err = await policyError(() => signInOrCreate(identity));
    expect(err.code).toBe("invalid_id_token");
    expect(err.message).toBe("could not allocate a username");
    // 1 email probe + 8 username probes
    expect(mocks.user.findUnique).toHaveBeenCalledTimes(9);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});

describe("linkAccount", () => {
  it("refuses a subject that already belongs to another account (link_conflict)", async () => {
    mocks.oAuthAccount.findUnique.mockResolvedValue({ userId: "u-other" });

    const err = await policyError(() => linkAccount("u-me", identity));
    expect(err.code).toBe("link_conflict");
    expectSubjectLookup(mocks.oAuthAccount.findUnique);
    expect(mocks.oAuthAccount.create).not.toHaveBeenCalled();
  });

  it("attaches a fresh subject to the session user", async () => {
    mocks.oAuthAccount.findUnique.mockResolvedValue(null);
    mocks.oAuthAccount.create.mockResolvedValue({});

    await expect(linkAccount("u-me", identity)).resolves.toBeUndefined();

    expect(mocks.oAuthAccount.create).toHaveBeenCalledWith({
      data: {
        userId: "u-me",
        provider: PROVIDER,
        providerAccountId: identity.subject,
        emailAtLinkTime: identity.email,
      },
    });
  });
});

describe("unlinkAccount", () => {
  it("refuses when the account has no password (last_method)", async () => {
    mocks.user.findUnique.mockResolvedValue({ passwordHash: null });

    const err = await policyError(() => unlinkAccount("u-me", PROVIDER));
    expect(err.code).toBe("last_method");
    expect(mocks.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u-me" },
      select: { passwordHash: true },
    });
    expect(mocks.oAuthAccount.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses the same way for an unknown user (it has no password either)", async () => {
    mocks.user.findUnique.mockResolvedValue(null);

    const err = await policyError(() => unlinkAccount("ghost", PROVIDER));
    expect(err.code).toBe("last_method");
  });

  it("removes the link when a password exists", async () => {
    mocks.user.findUnique.mockResolvedValue({
      passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
    });
    mocks.oAuthAccount.deleteMany.mockResolvedValue({ count: 1 });

    await expect(unlinkAccount("u-me", PROVIDER)).resolves.toBeUndefined();

    expect(mocks.oAuthAccount.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-me", provider: PROVIDER },
    });
  });

  it("stays idempotent when nothing is linked (e2e expects 200)", async () => {
    mocks.user.findUnique.mockResolvedValue({
      passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
    });
    mocks.oAuthAccount.deleteMany.mockResolvedValue({ count: 0 });

    await expect(unlinkAccount("u-me", PROVIDER)).resolves.toBeUndefined();
  });
});

// guard: OAuthError is what the callback route maps onto the ?error= codes
// the browser is redirected with (lib/auth/oauth/errors.ts)
describe("OAuthError", () => {
  it("carries the policy code on the error itself", () => {
    const err = new OAuthError("account_exists", "msg");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("OAuthError");
    expect(err.code).toBe("account_exists");
    expect(err.message).toBe("msg");
  });
});
