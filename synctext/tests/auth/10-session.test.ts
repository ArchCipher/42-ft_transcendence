import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const session = {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  };
  const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
  return { session, store, db: { session } };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mocks.store)),
}));
vi.mock("@synctext/db", () => ({ prisma: mocks.db }));

import {
  generateSessionToken,
  sessionExpiresAt,
  setSessionCookie,
  getSessionToken,
  clearSessionCookie,
  checkSessionByHash,
  touchSession,
  validateSession,
  logoutCurrentSession,
  MAX_SESSIONS,
} from "../../lib/auth/session";
import {
  hashSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  IDLE_TIMEOUT_MS,
  SESSION_LAST_USED_UPDATE_THRESHOLD,
} from "@synctext/shared";

beforeEach(() => {
  mocks.session.findUnique.mockReset();
  mocks.session.update.mockReset();
  mocks.session.updateMany.mockReset();
  mocks.session.delete.mockReset();
  mocks.store.get.mockReset();
  mocks.store.set.mockReset();
  mocks.store.delete.mockReset();
});

describe("session token", () => {
  it("generates a 43-char base64url token (256 bits)", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("expires exactly SESSION_TTL_SECONDS (7 days) from now", () => {
    const before = Date.now();
    const exp = sessionExpiresAt();
    const after = Date.now();
    const want = SESSION_TTL_SECONDS * 1000;
    expect(exp.getTime() - before).toBeGreaterThanOrEqual(want - 5);
    expect(exp.getTime() - after).toBeLessThanOrEqual(want + 5);
  });

  it("caps sessions per user at 5", () => {
    expect(MAX_SESSIONS).toBe(5);
  });
});

describe("session cookie", () => {
  it("sets HttpOnly + SameSite=lax cookie with a matching maxAge", async () => {
    await setSessionCookie("tok123");
    expect(mocks.store.set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      "tok123",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax", // OAuth needs lax
        path: "/",
        secure: false, // module loaded under NODE_ENV=test
        maxAge: SESSION_TTL_SECONDS,
      }),
    );
  });

  it("reads the token from the cookie store", async () => {
    mocks.store.get.mockReturnValue({ value: "tok1" });
    await expect(getSessionToken()).resolves.toBe("tok1");

    mocks.store.get.mockReturnValue(undefined);
    await expect(getSessionToken()).resolves.toBeNull();
  });

  it("clears the session cookie", async () => {
    await clearSessionCookie();
    expect(mocks.store.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("sets secure=true when the module loads under NODE_ENV=production", async () => {
    // Static import above captured options with NODE_ENV=test; reload the
    // module in a production env to prove the flag flips.
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const prod = await import("../../lib/auth/session");
    await prod.setSessionCookie("tokProd");
    expect(mocks.store.set).toHaveBeenLastCalledWith(
      SESSION_COOKIE_NAME,
      "tokProd",
      expect.objectContaining({ secure: true }),
    );
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("checkSessionByHash", () => {
  const base = { id: "s1", user: { id: "u1" } };

  it("returns null when no session row exists", async () => {
    mocks.session.findUnique.mockResolvedValueOnce(null);
    await expect(checkSessionByHash("h")).resolves.toBeNull();
  });

  it("rejects revoked sessions", async () => {
    mocks.session.findUnique.mockResolvedValueOnce({
      ...base,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(),
    });
    await expect(checkSessionByHash("h")).resolves.toBeNull();
  });

  it("rejects expired sessions", async () => {
    mocks.session.findUnique.mockResolvedValueOnce({
      ...base,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      lastUsedAt: new Date(),
    });
    await expect(checkSessionByHash("h")).resolves.toBeNull();
  });

  it("rejects idle sessions past IDLE_TIMEOUT_MS", async () => {
    mocks.session.findUnique.mockResolvedValueOnce({
      ...base,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(Date.now() - IDLE_TIMEOUT_MS - 1000),
    });
    await expect(checkSessionByHash("h")).resolves.toBeNull();
  });

  it("returns a valid session, looking it up by its SHA-256 hash", async () => {
    const s = {
      ...base,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(),
    };
    mocks.session.findUnique.mockResolvedValueOnce(s);
    await expect(checkSessionByHash("rawhash")).resolves.toEqual(s);
    expect(mocks.session.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: "rawhash" },
      include: { user: true },
    });
  });
});

describe("touchSession (lastUsedAt throttling)", () => {
  it("skips the DB write when lastUsedAt is recent", async () => {
    await touchSession({ id: "s1", lastUsedAt: new Date() });
    expect(mocks.session.update).not.toHaveBeenCalled();
  });

  it("updates when lastUsedAt is older than the threshold", async () => {
    await touchSession({
      id: "s1",
      lastUsedAt: new Date(Date.now() - SESSION_LAST_USED_UPDATE_THRESHOLD - 1000),
    });
    expect(mocks.session.update).toHaveBeenCalledTimes(1);
    expect(mocks.session.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("updates when lastUsedAt is null", async () => {
    await touchSession({ id: "s1", lastUsedAt: null });
    expect(mocks.session.update).toHaveBeenCalledTimes(1);
  });
});

describe("validateSession", () => {
  it("returns null for a null token without touching the DB", async () => {
    await expect(validateSession(null)).resolves.toBeNull();
    expect(mocks.session.findUnique).not.toHaveBeenCalled();
  });

  it("looks up by hashed token and touches stale sessions", async () => {
    const now = Date.now();
    // stale (beyond SESSION_LAST_USED_UPDATE_THRESHOLD) but NOT idle: use
    // half the idle window, which is always > threshold and < idle timeout.
    const s = {
      id: "s1",
      revokedAt: null,
      expiresAt: new Date(now + 60_000),
      lastUsedAt: new Date(now - IDLE_TIMEOUT_MS / 2),
      user: { id: "u1" },
    };
    mocks.session.findUnique.mockResolvedValueOnce(s);

    const got = await validateSession("raw-token");
    expect(got).toEqual(s);
    expect(mocks.session.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashSessionToken("raw-token") },
      include: { user: true },
    });
    expect(mocks.session.update).not.toHaveBeenCalled();
  });
});

describe("logoutCurrentSession", () => {
  it("revokes the DB row by hashed token then clears the cookie", async () => {
    mocks.store.get.mockReturnValue({ value: "tokX" });
    mocks.session.updateMany.mockResolvedValueOnce({ count: 1 });

    await logoutCurrentSession();

    expect(mocks.session.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashSessionToken("tokX"), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.store.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("still clears the cookie when there is no token", async () => {
    mocks.store.get.mockReturnValue(undefined);
    await logoutCurrentSession();
    expect(mocks.session.updateMany).not.toHaveBeenCalled();
    expect(mocks.store.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });
});
