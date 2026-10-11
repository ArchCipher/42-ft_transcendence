import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookie Policy" };

export default async function CookiesPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p>
        <strong>Last updated:</strong> 2026-09-17
      </p>

      <h2 id="what-are-cookies">What are cookies?</h2>
      <p>
        Cookies are small text files placed on your device by websites you
        visit. They are widely used to make websites work, improve efficiency,
        and provide reporting information.
      </p>

      <h2 id="how-synctext-uses-cookies">How synctext uses cookies</h2>
      <p>
        synctext uses <strong>one cookie only</strong>, and it is strictly
        necessary for the service to function.
      </p>

      <h3>Session cookie (essential)</h3>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Name</strong>
            </td>
            <td>
              <code>session</code> (or equivalent session identifier)
            </td>
          </tr>
          <tr>
            <td>
              <strong>Purpose</strong>
            </td>
            <td>Keeps you signed in between page loads</td>
          </tr>
          <tr>
            <td>
              <strong>Type</strong>
            </td>
            <td>
              <code>HttpOnly</code>, <code>SameSite=Lax</code>,{" "}
              <code>Secure</code>
            </td>
          </tr>
          <tr>
            <td>
              <strong>Duration</strong>
            </td>
            <td>
              Lifetime 7 days from creation. Additionally, sessions are
              invalidated server-side after 2 hours without activity.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Storage</strong>
            </td>
            <td>
              Server stores only the SHA-256 hash of the token. The raw value is
              in the cookie only
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        This cookie is <strong>essential</strong> &mdash; without it, you would
        need to re-enter your credentials on every page. Because it is strictly
        necessary, no consent banner is required under the ePrivacy Directive.
      </p>

      <h2 id="what-we-do-not-do">What we do NOT do</h2>
      <ul>
        <li>
          We do <strong>not</strong> set advertising or tracking cookies.
        </li>
        <li>
          We do <strong>not</strong> use Google Analytics, Facebook Pixel, or
          any third-party analytics.
        </li>
        <li>
          We do <strong>not</strong> share cookie data with advertisers or third
          parties.
        </li>
        <li>
          We do <strong>not</strong> use cookies to build user profiles for
          marketing.
        </li>
      </ul>

      <h2 id="other-tokens">Other tokens (not cookies)</h2>
      <p>
        Email verification and password reset tokens are sent to you via email
        as part of a link. They are not stored as cookies on your device. They
        are single-use and time-limited (24 hours for email verification, 30
        minutes for password reset).
      </p>

      <h2 id="your-choices">Your choices</h2>
      <p>
        Since the only cookie we use is strictly necessary for the service,
        there is nothing to opt out of. If you disable cookies entirely in your
        browser, you will not be able to stay signed in to synctext.
      </p>

      <h2 id="changes-to-this-policy">Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Changes will be reflected
        by updating the date at the top of this page.
      </p>
    </>
  );
}
