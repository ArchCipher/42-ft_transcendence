import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy — synctext</h1>
      <p>
        <strong>Last updated:</strong> 2026-09-17
      </p>

      <h2 id="who-we-are">1. Who we are</h2>
      <p>
        synctext is a collaborative, real-time text editor that lets you and
        others edit documents together. This Privacy Policy explains what
        personal information we collect, why we collect it, and how you can
        control it.
      </p>

      <h2 id="information-we-collect">2. Information we collect</h2>
      <p>
        <strong>2.1 Information you provide directly</strong>
      </p>
      <ul>
        <li>
          <strong>Account data</strong>: email address, username, optional
          avatar, and a password (stored only as a one-way Argon2id hash &mdash;
          we can never read it).
        </li>
        <li>
          <strong>Profile and content</strong>: your documents and their
          content, comments, organizations you create, friend relationships, and
          any text you write while using the service.
        </li>
      </ul>
      <p>
        <strong>2.2 Information we collect automatically</strong>
      </p>
      <ul>
        <li>
          <strong>Usage data</strong>: online-status timestamps (
          <code>lastSeenAt</code>).
        </li>
        <li>
          <strong>Technical data</strong>: IP address and user-agent string,
          captured <strong>only when a session is created</strong>{" "}
          (login/registration), and login timestamps. They are used solely for
          security and abuse prevention (e.g. rate limiting, brute-force
          lockout) and stored on the session record.
        </li>
        <li>
          <strong>Cookies</strong>: a single session cookie (see &sect;4). We
          set no other cookies and use no advertising or tracking.
        </li>
      </ul>
      <p>
        <strong>2.3 Information from third parties (OAuth)</strong>
      </p>
      <ul>
        <li>
          If you sign in with Google, GitHub, or 42, we receive the email
          address and profile information that your provider shares with us at
          sign-in, and store a reference (<code>providerAccountId</code>) to
          link your account. We do not store your provider access tokens.
        </li>
      </ul>

      <h2 id="why-and-how-we-use-your-data">
        3. Why and how we use your data (legal bases)
      </h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Data used</th>
            <th>Legal basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Creating and managing your account</td>
            <td>email, username, password hash</td>
            <td>Performance of contract / consent</td>
          </tr>
          <tr>
            <td>Authenticating you and keeping sessions secure</td>
            <td>session token, IP, user-agent</td>
            <td>Legitimate interest (security)</td>
          </tr>
          <tr>
            <td>Verifying your email and resetting passwords</td>
            <td>email + transient verification/reset tokens</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Enabling real-time collaboration and sharing</td>
            <td>documents, comments, org memberships, friend links</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Notifying you before a dormant account is deleted</td>
            <td>email address</td>
            <td>Legitimate interest / compliance</td>
          </tr>
          <tr>
            <td>Preventing abuse, fraud and attacks</td>
            <td>IP, user-agent, rate-limit records</td>
            <td>Legitimate interest (security)</td>
          </tr>
          <tr>
            <td>Complying with legal obligations</td>
            <td>account records</td>
            <td>Legal obligation</td>
          </tr>
        </tbody>
      </table>
      <p>
        We <strong>do not</strong> sell, rent, or trade your personal data. We{" "}
        <strong>do not</strong> run third-party advertising, analytics, or
        tracking of any kind. Email is used only for transactional messages:
        email verification, password reset, and the mandatory dormant-account
        warning. We never send marketing emails.
      </p>

      <h2 id="cookies">4. Cookies</h2>
      <ul>
        <li>
          <strong>Session cookie</strong> (essential): <code>HttpOnly</code>,{" "}
          <code>SameSite=Lax</code>, <code>Secure</code> in production.
          Stores an opaque token (only its hash is stored server-side) to keep
          you signed in. Lifetime 7 days from creation and invalidated after 2
          hours of inactivity.
        </li>
        <li>
          <strong>Email verification / password-reset tokens</strong> are not
          cookies: they are single-use, time-limited tokens sent inside the link
          of a transactional email.
        </li>
        <li>
          No other cookies are set. Because the only cookie is strictly
          necessary, no consent banner is required. This notice serves as our
          cookie disclosure.
        </li>
      </ul>

      <h2 id="sharing-of-data">5. Sharing of data</h2>
      <p>
        We share data only with the processors required to run the service, and
        only as far as needed:
      </p>
      <table>
        <thead>
          <tr>
            <th>Processor</th>
            <th>Purpose</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Self-hosted infrastructure (our own machines, run via Docker
              Compose)
            </td>
            <td>Application + database hosting</td>
            <td>
              All account/content data, transient rate-limit IPs/accounts
              (in-memory, lost on restart)
            </td>
          </tr>
          <tr>
            <td>PostgreSQL database</td>
            <td>Data storage</td>
            <td>Account, doc, comment, org, friend data</td>
          </tr>
          <tr>
            <td>Mailpit</td>
            <td>Transactional email delivery</td>
            <td>Email address, reset/verification tokens</td>
          </tr>
          <tr>
            <td>Google / GitHub / 42</td>
            <td>OAuth sign-in</td>
            <td>Whatever their OAuth consent screen grants us</td>
          </tr>
        </tbody>
      </table>
      <p>
        We never sell your data. We may disclose data where required by law, or
        to enforce our Terms of Service.
      </p>

      <h2 id="international-data-transfers">6. International data transfers</h2>
      <p>
        All data is stored on infrastructure we operate ourselves (machines we
        control), located within the European Union. We do not transfer your
        personal data outside the EEA.
      </p>

      <h2 id="data-retention-and-deletion">7. Data retention and deletion</h2>
      <ul>
        <li>
          <strong>Active accounts</strong>: data is kept while your account is
          active and deleted when you delete your account. Deleting your account
          deletes (cascades) your friend links, org memberships and documents
          you own.
        </li>
        <li>
          <strong>Sessions</strong> are revoked on logout, password change, and
          account deletion, and expire after 7 days.
        </li>
        <li>
          <strong>Password reset and email verification tokens</strong> are
          deleted once used or after they expire (30 minutes / 24 hours).
        </li>
        <li>
          <strong>Backups</strong> may retain deleted data for up to{" "}
          <strong>30 days</strong>, after which it is purged.
        </li>
        <li>
          We do not keep data longer than necessary for the purposes described
          here.
        </li>
      </ul>

      <h2 id="security">8. Security</h2>
      <p>
        We apply security best practices from OWASP and The Copenhagen Book:
      </p>
      <ul>
        <li>
          Passwords hashed with <strong>Argon2id</strong>. We never store or
          transmit plaintext passwords.
        </li>
        <li>
          Session tokens are 256-bit random values. Only a{" "}
          <strong>SHA-256 hash</strong> is stored in our database, so a database
          leak cannot be used to impersonate you.
        </li>
        <li>
          All traffic is served over <strong>HTTPS/TLS 1.2+</strong>.
        </li>
        <li>
          Rate limiting and login lockout to resist brute force. CSRF
          protections on state-changing requests.
        </li>
        <li>
          Secrets (OAuth keys, DB credentials) are held in environment variables
          and never committed to source control.
        </li>
      </ul>
      <p>
        No system is 100% secure, but we take reasonable measures to protect
        your information.
      </p>

      <h2 id="your-rights">9. Your rights</h2>
      <p>
        Depending on where you live (in particular if you are in the EU/EEA
        under GDPR), you have the right to:
      </p>
      <ul>
        <li>
          <strong>Access</strong> a copy of your personal data.
        </li>
        <li>
          <strong>Rectify</strong> inaccurate data.
        </li>
        <li>
          <strong>Erasure</strong> (&ldquo;right to be forgotten&rdquo;) &mdash;
          delete your account and data.
        </li>
        <li>
          <strong>Restrict or object</strong> to processing.
        </li>
        <li>
          <strong>Data portability</strong> &mdash; receive your data in a
          machine-readable format.
        </li>
        <li>
          <strong>Withdraw consent</strong> where consent is the legal basis.
        </li>
      </ul>
      <p>To exercise any of these delete your account from the app.</p>

      <h2 id="children">10. Children</h2>
      <p>
        The service is not directed at children. You must be at least{" "}
        <strong>16 years old</strong> to use synctext. We do not knowingly
        collect data from children under this age. If you believe a child has
        provided us data, contact us and we will delete it.
      </p>

      <h2 id="data-minimisation">11. Data minimisation</h2>
      <p>
        We collect only the data needed to provide the service described in this
        policy, and no more. Optional fields (e.g. avatar) are not required to
        use the service.
      </p>

      <h2 id="changes-to-this-policy">12. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. We will notify you of
        material changes by updating the date at the top of this page. Continued
        use after changes means you accept the updated policy.
      </p>
    </>
  );
}
