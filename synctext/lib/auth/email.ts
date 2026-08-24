import { passwordResetUrl } from "./password-reset";
import { verificationUrl } from "./verification";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://mailpit:8025";

export function renderVerificationEmailHtml(token: string): string {
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="padding:48px 0;font-family:Arial,Helvetica,sans-serif;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="max-width:480px;margin: 0 auto;background:#ffffff;border:1px solid #d4d9e0;border-radius:8px;text-align:left;">
            <tr><td style="padding:40px;color:#9ca3af">
              <p style="margin:0 0 24px;color:#6b7280;font-size:12px;letter-spacing:1.5px;">SYNCTEXT</p>
              <h1 style="margin:0 0 12px;font-size:24px;color:#111827;line-height:1.3;">Verify your email address</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;">
                To finish creating your account, please verify this email address belongs to you.
              </p>
              <a href="${verificationUrl(token)}"
                style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                    font-size:15px;font-weight:600;padding:12px 28px;border-radius:6px;">
                Confirm my account
              </a>
              <hr style="border:0;border-top:1px solid #d4d9e0;margin:32px 0 24px;" />
              <p style="margin:0 0 0;font-size:13px;line-height:1.5;">
                This link expires in 24 hours. If you didn't sign up for Synctext, you can safely ignore this email.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    `;
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
	signal: AbortSignal.timeout(10_000), // abort if mailpit doesn't answer in 10s
    body: JSON.stringify({
      From: { Email: "noreply@synctext.app", Name: "SyncText" },
      To: [{ Email: email }],
      Subject: "Verify your email address",
      HTML: renderVerificationEmailHtml(token),
    }),
  });
  if (!res.ok) throw new Error(`Mailpit send failed: ${res.status}`);
}

export function renderPasswordResetEmailHtml(token: string): string {
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="padding:48px 0;font-family:Arial,Helvetica,sans-serif;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="max-width:480px;margin: 0 auto;background:#ffffff;border:1px solid #d4d9e0;border-radius:8px;text-align:left;">
            <tr><td style="padding:40px;color:#9ca3af">
              <p style="margin:0 0 24px;color:#6b7280;font-size:12px;letter-spacing:1.5px;">SYNCTEXT</p>
              <h1 style="margin:0 0 12px;font-size:24px;color:#111827;line-height:1.3;">Reset your password</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;">
                Please use the link below to change your password
              </p>
              <a href="${passwordResetUrl(token)}"
                style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                    font-size:15px;font-weight:600;padding:12px 28px;border-radius:6px;">
                Change my password
              </a>
              <hr style="border:0;border-top:1px solid #d4d9e0;margin:32px 0 24px;" />
              <p style="margin:0 0 0;font-size:13px;line-height:1.5;">
                This link expires in 24 hours. If you didn't request for a password reset for Synctext, you can safely ignore this email.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    `;
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
	signal: AbortSignal.timeout(10_000), // abort if mailpit doesn't answer in 10s
    body: JSON.stringify({
      From: { Email: "noreply@synctext.app", Name: "SyncText" },
      To: [{ Email: email }],
      Subject: "Verify your email address",
      HTML: renderPasswordResetEmailHtml(token),
    }),
  });
  if (!res.ok) throw new Error(`Mailpit send failed: ${res.status}`);
}
