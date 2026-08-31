import { passwordResetUrl } from "./password-reset";
import { verificationUrl } from "./verification";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://mailpit:8025";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000), // abort if mailpit doesn't answer in 10s
    body: JSON.stringify({
      From: { Email: "noreply@synctext.app", Name: "SyncText" },
      To: [{ Email: to }],
      Subject: subject,
      HTML: html,
    }),
  });
  if (!res.ok) throw new Error(`Mailpit send failed: ${res.status}`);
}

/*
Template inputs MUST remain developer-controlled constants.
If user-derived text ever needs rendering here (Example: a username), it MUST be
HTML escaped first ( & < > " ' ). Raw interpolation makes these emails an
HTML-injection / phishing vector.
*/
export function renderEmailHtml(o: {
  heading: string;
  body: string;
  buttonLabel: string;
  url: string;
  footer: string;
}) {
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="padding:48px 0;font-family:Arial,Helvetica,sans-serif;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="max-width:480px;margin: 0 auto;background:#ffffff;border:1px solid #d4d9e0;border-radius:8px;text-align:left;">
            <tr><td style="padding:40px;color:#9ca3af">
              <p style="margin:0 0 24px;color:#6b7280;font-size:12px;letter-spacing:1.5px;">SYNCTEXT</p>
              <h1 style="margin:0 0 12px;font-size:24px;color:#111827;line-height:1.3;">${o.heading}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;">
                ${o.body}
              </p>
              <a href="${o.url}"
                style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                    font-size:15px;font-weight:600;padding:12px 28px;border-radius:6px;">
                ${o.buttonLabel}
              </a>
              <hr style="border:0;border-top:1px solid #d4d9e0;margin:32px 0 24px;" />
              <p style="margin:0 0 0;font-size:13px;line-height:1.5;">
                ${o.footer}
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    `;
}

export function renderVerificationEmailHtml(token: string): string {
  return renderEmailHtml({
    heading: "Verify your email",
    body: "To finish creating your account, please verify this email address belongs to you.",
    buttonLabel: "Confirm my account",
    url: verificationUrl(token),
    footer:
      "This link expires in 24 hours. If you didn't sign up for Synctext, you can safely ignore this email.",
  });
}

export function renderPasswordResetEmailHtml(token: string): string {
  return renderEmailHtml({
    heading: "Reset your password",
    body: "Please use the link below to change your password.",
    buttonLabel: "Change my password",
    url: passwordResetUrl(token),
    footer:
      "This link expires in 30 minutes. If you didn't request for a password reset for Synctext, you can safely ignore this email.",
  });
}

export const sendVerificationEmail = (email: string, token: string) =>
  sendEmail(email, "Verify your email", renderVerificationEmailHtml(token));

export const sendPasswordResetEmail = (email: string, token: string) =>
  sendEmail(email, "Reset your password", renderPasswordResetEmailHtml(token));
