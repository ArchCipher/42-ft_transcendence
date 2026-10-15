import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const guestSession = {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
  return { guestSession, store, db: { guestSession } };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mocks.store)),
}));
vi.mock("@synctext/db", () => ({ prisma: mocks.db }));

import {
  generateGuestSessionToken,
  guestEditExpiresAt,
  guestSessionExpiresAt,
  getGuestSessionStatus,
  setGuestSessionCookie,
  getGuestSessionToken,
  clearGuestSessionCookie,
  validateGuestSession,
} from "../../lib/auth/guest-session";
import {
  hashGuestSessionToken,
  GUEST_SESSION_COOKIE_NAME,
  GUEST_EDIT_TTL_MS,
  GUEST_SESSION_TTL_MS,
} from "@synctext/shared";

beforeEach(() => {
  mocks.guestSession.findUnique.mockReset();
  mocks.guestSession.update.mockReset();
  mocks.guestSession.delete.mockReset();
  mocks.store.get.mockReset();
  mocks.store.set.mockReset();
  mocks.store.delete.mockReset();
});

describe("guest session token & expiry", () => {
  it("generates 43-char base64url tokens that differ per call", () => {
    const a = generateGuestSessionToken();
    const b = generateGuestSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("guest edit expiry = now + GUEST_EDIT_TTL_MS (30 min)", () => {
    const now = new Date(1_000_000);
    expect(guestEditExpiresAt(now).getTime()).toBe(
      1_000_000 + GUEST_EDIT_TTL_MS,
    );
  });

  it("guest session expiry = now + GUEST_SESSION_TTL_MS (35 min = edit+grace)", () => {
    const now = new Date(2_000_000);
    expect(guestSessionExpiresAt(now).getTime()).toBe(
      2_000_000 + GUEST_SESSION_TTL_MS,
    );
  });
});

describe("getGuestSessionStatus (mode transitions)", () => {
  const s = { editExpiresAt: new Date(10_000), expiresAt: new Date(20_000) };

  it("is EDITABLE before the edit deadline", () => {
    expect(getGuestSessionStatus(s, new Date(5_000))).toBe("EDITABLE");
  });

  it("drops to READ_ONLY exactly at the edit deadline", () => {
    expect(getGuestSessionStatus(s, new Date(10_000))).toBe("READ_ONLY");
  });

  it("is READ_ONLY between edit and session expiry", () => {
    expect(getGuestSessionStatus(s, new Date(15_000))).toBe("READ_ONLY");
  });

  it("is EXPIRED exactly at (and after) the session deadline", () => {
    expect(getGuestSessionStatus(s, new Date(20_000))).toBe("EXPIRED");
    expect(getGuestSessionStatus(s, new Date(25_000))).toBe("EXPIRED");
  });
});

describe("guest session cookie", () => {
  it("sets HttpOnly + SameSite=lax guest cookie", async () => {
    await setGuestSessionCookie("gtok");
    expect(mocks.store.set).toHaveBeenCalledWith(
      GUEST_SESSION_COOKIE_NAME,
      "gtok",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax", // OAuth needs lax
        path: "/",
        secure: false, // NODE_ENV=test
      }),
    );
  });

  it("reads and clears the guest cookie independently of the session cookie", async () => {
    mocks.store.get.mockReturnValue({ value: "gtok1" });
    await expect(getGuestSessionToken()).resolves.toBe("gtok1");

    mocks.store.get.mockReturnValue(undefined);
    await expect(getGuestSessionToken()).resolves.toBeNull();

    await clearGuestSessionCookie();
    expect(mocks.store.delete).toHaveBeenCalledWith(GUEST_SESSION_COOKIE_NAME);
  });
});

describe("validateGuestSession", () => {
  it("returns null for a null token without querying", async () => {
    await expect(validateGuestSession(null)).resolves.toBeNull();
    expect(mocks.guestSession.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the token hash has no session", async () => {
    mocks.guestSession.findUnique.mockResolvedValueOnce(null);
    await expect(validateGuestSession("ghost-token")).resolves.toBeNull();
  });

  it("returns null for an EXPIRED session (never resolves to stale data)", async () => {
    mocks.guestSession.findUnique.mockResolvedValueOnce({
      tokenHash: "h",
      editExpiresAt: new Date(Date.now() - 2000),
      expiresAt: new Date(Date.now() - 1000),
      document: { id: "d1" },
    });
    await expect(validateGuestSession("tok")).resolves.toBeNull();
  });

  it("resolves an editable session with its mode", async () => {
    const row = {
      tokenHash: "h",
      editExpiresAt: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 120_000),
      document: { id: "d1" },
    };
    mocks.guestSession.findUnique.mockResolvedValueOnce(row);

    const got = await validateGuestSession("raw-token");
    expect(got).toEqual({ ...row, mode: "EDITABLE" });
    expect(mocks.guestSession.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashGuestSessionToken("raw-token") },
      include: { document: true },
    });
  });

  it("resolves a read-only session with its mode", async () => {
    const row = {
      tokenHash: "h",
      editExpiresAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 60_000),
      document: { id: "d1" },
    };
    mocks.guestSession.findUnique.mockResolvedValueOnce(row);

    const got = await validateGuestSession("raw-token");
    expect(got).toEqual({ ...row, mode: "READ_ONLY" });
  });
});
