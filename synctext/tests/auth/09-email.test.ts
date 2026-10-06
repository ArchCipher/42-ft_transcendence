import { describe, it, expect, vi, afterEach } from "vitest";

import {
  renderEmailHtml,
  renderVerificationEmailHtml,
  renderPasswordResetEmailHtml,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../lib/auth/email";

afterEach(() => {
  vi.unstubAllGlobals();
});

const TOKEN = "aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789_-";

describe("renderEmailHtml templates", () => {
  it("renders a full template with the provided inputs", () => {
    const html = renderEmailHtml({
      heading: "Verify your email",
      body: "Please confirm your address.",
      buttonLabel: "Confirm",
      url: "https://localhost:8443/verify-email?token=xyz",
      footer: "expires in 24 hours.",
    });
    expect(html).toContain("Verify your email");
    expect(html).toContain("Please confirm your address.");
    expect(html).toContain("Confirm");
    expect(html).toContain('href="https://localhost:8443/verify-email?token=xyz"');
    expect(html).toContain("expires in 24 hours.");
  });

  it("renders the verification email with a token URL", () => {
    const html = renderVerificationEmailHtml(TOKEN);
    expect(html).toContain("Confirm my account");
    expect(html).toContain("expires in 24 hours");
    expect(html).toContain("/verify-email?token=");
  });

  it("renders the password reset email with a token URL", () => {
    const html = renderPasswordResetEmailHtml(TOKEN);
    expect(html).toContain("Change my password");
    expect(html).toContain("expires in 30 minutes");
    expect(html).toContain("/password-reset?token=");
  });
});

describe("sendEmail (Mailpit transport)", () => {
  const mailpit = process.env.MAILPIT_URL ?? "http://mailpit:8025";

  /*
    The fetch arguments have to be declared, and that is the whole fix for the
    TS2352/TS2493/TS2339 errors this file used to raise:

      vi.fn(() => ...)            // infers mock.calls as []
      vi.fn((url, init) => ...)   // infers [string, RequestInit]

    With the untyped form, `calls[0][1]` does not exist (TS2493), a cast to
    RequestInit does not overlap (TS2352), and the result is `never`, which has
    no `.body` (TS2339).

    Capturing the call also means the parameters are genuinely used, so this
    stays clean under `eslint --max-warnings=0` regardless of how
    no-unused-vars is configured.
  */
  const stubFetch = (response: { ok: boolean; status?: number }) => {
    const sent: { url: string; init: RequestInit } = { url: "", init: {} };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init: RequestInit) => {
        sent.url = url;
        sent.init = init;
        return Promise.resolve(response);
      }),
    );
    return sent;
  };

  it("POSTs the envelope to Mailpit's API", async () => {
    const sent = stubFetch({ ok: true });

    await sendEmail("user@example.com", "Hello", "<p>hi</p>");

    expect(sent.url).toBe(`${mailpit}/api/v1/send`);
    expect(sent.init.method).toBe("POST");
    const body = JSON.parse(String(sent.init.body));
    expect(body.From.Email).toBe("noreply@synctext.app");
    expect(body.To).toEqual([{ Email: "user@example.com" }]);
    expect(body.Subject).toBe("Hello");
    expect(body.HTML).toBe("<p>hi</p>");
  });

  it("throws when Mailpit returns an error status", async () => {
    stubFetch({ ok: false, status: 500 });

    await expect(
      sendEmail("u@example.com", "Subject", "<p>x</p>"),
    ).rejects.toThrow("Mailpit send failed: 500");
  });

  it("composes the verification email with a token link", async () => {
    const sent = stubFetch({ ok: true });

    await sendVerificationEmail("alice@example.com", TOKEN);

    const body = JSON.parse(String(sent.init.body));
    expect(body.Subject).toBe("Verify your email");
    expect(body.HTML).toContain(`/verify-email?token=${encodeURIComponent(TOKEN)}`);
  });

  it("composes the password reset email with a token link", async () => {
    const sent = stubFetch({ ok: true });

    await sendPasswordResetEmail("alice@example.com", TOKEN);

    const body = JSON.parse(String(sent.init.body));
    expect(body.Subject).toBe("Reset your password");
    expect(body.HTML).toContain(
      `/password-reset?token=${encodeURIComponent(TOKEN)}`,
    );
  });
});
