# Privacy Policy — synctext

> DRAFT — decisions recorded 2026-08-13. Items still marked **[TODO]** need confirmation before publishing.

**Last updated:** [TODO: date]

## 1. Who we are

synctext is a collaborative, real-time text editor that lets you and others edit documents together. This Privacy Policy explains what personal information we collect, why we collect it, and how you can control it.

Contact for privacy matters: **[TODO: privacy contact email]**

## 2. Information we collect

**2.1 Information you provide directly**
- **Account data**: email address, username, optional avatar, and a password (stored only as a one-way Argon2id hash — we can never read it).
- **Profile and content**: your documents and their content, comments, organizations you create, friend relationships, and any text you write while using the service.

**2.2 Information we collect automatically**
- **Usage data**: online-status timestamps (`lastSeenAt`), notification read state.
- **Technical data**: IP address and user-agent string, captured **only when a session is created** (login/registration), and login timestamps. They are used solely for security and abuse prevention (e.g. rate limiting, brute-force lockout) and stored on the session record.
- **Cookies**: a single session cookie (see §4). We set no other cookies and use no advertising or tracking.

**2.3 Information from third parties (OAuth)**
- If you sign in with Google, GitHub, or 42, we receive the email address and profile information that your provider shares with us at sign-in, and store a reference (`providerAccountId`) to link your account. We do not store your provider access tokens.

## 3. Why and how we use your data (legal bases)

| Purpose | Data used | Legal basis |
|---|---|---|
| Creating and managing your account | email, username, password hash | Performance of contract / consent |
| Authenticating you and keeping sessions secure | session token, IP, user-agent | Legitimate interest (security) |
| Verifying your email and resetting passwords | email + transient verification/reset tokens | Performance of contract |
| Enabling real-time collaboration and sharing | documents, comments, org memberships, friend links | Performance of contract |
| Sending in-app notifications | notification records | Performance of contract |
| Notifying you before a dormant account is deleted | email address | Legitimate interest / compliance |
| Preventing abuse, fraud and attacks | IP, user-agent, rate-limit records | Legitimate interest (security) |
| Complying with legal obligations | account records | Legal obligation |

We **do not** sell, rent, or trade your personal data. We **do not** run third-party advertising, analytics, or tracking of any kind. Email is used only for transactional messages: email verification, password reset, and the mandatory dormant-account warning. We never send marketing emails.

## 4. Cookies

- **Session cookie** (essential): `HttpOnly`, `SameSite=Strict`, `Secure` in production. Stores an opaque token (only its hash is stored server-side) to keep you signed in. Expires after 7 days of inactivity.
- **Email verification / password-reset tokens** are not cookies: they are single-use, time-limited tokens sent inside the link of a transactional email.
- No other cookies are set. Because the only cookie is strictly necessary, no consent banner is required; this notice serves as our cookie disclosure.

## 5. Sharing of data

We share data only with the processors required to run the service, and only as far as needed:

| Processor | Purpose | Data |
|---|---|---|
| Self-hosted infrastructure (our own machines, run via Docker Compose) | Application + database hosting | All account/content data, transient rate-limit IPs/accounts (in-memory, lost on restart) |
| PostgreSQL database | Data storage | Account, doc, comment, org, friend data |
| Envello | Transactional email delivery (EU-hosted) | Email address, reset/verification tokens |
| Google / GitHub / 42 | OAuth sign-in | Whatever their OAuth consent screen grants us |

We never sell your data. We may disclose data where required by law, or to enforce our Terms of Service.

## 6. International data transfers

All data is stored on infrastructure we operate ourselves (machines we control), located within the European Union. We do not transfer your personal data outside the EEA.

## 7. Data retention and deletion

- **Active accounts**: data is kept while your account is active and deleted when you delete your account. Deleting your account deletes (cascades) your friend links, org memberships, notifications, and documents you own.
- **Dormant accounts**: if you do not sign in for **12 months**, we send a warning email 30 days before deletion. Unless you sign back in, your account and associated data are **deleted 12 months after your last sign-in**.
- **Sessions** are revoked on logout, password change, and account deletion, and expire after 7 days.
- **Password reset and email verification tokens** are deleted once used or after they expire (30 minutes / 24 hours).
- **Backups** may retain deleted data for up to **30 days**, after which it is purged.
- We do not keep data longer than necessary for the purposes described here.

## 8. Security

We apply security best practices from OWASP and The Copenhagen Book:

- Passwords hashed with **Argon2id**; we never store or transmit plaintext passwords.
- Session tokens are 256-bit random values; only a **SHA-256 hash** is stored in our database, so a database leak cannot be used to impersonate you.
- All traffic is served over **HTTPS/TLS 1.2+**.
- Rate limiting and login lockout to resist brute force; CSRF protections on state-changing requests.
- Secrets (OAuth keys, DB credentials) are held in environment variables and never committed to source control. **[Planned]** — secrets will move to **HashiCorp Vault** and the application will be fronted by a **WAF (ModSecurity, OWASP CRS)** in a later hardening phase.

No system is 100% secure, but we take reasonable measures to protect your information.

## 9. Your rights

Depending on where you live (in particular if you are in the EU/EEA under GDPR), you have the right to:

- **Access** a copy of your personal data;
- **Rectify** inaccurate data;
- **Erasure** ("right to be forgotten") — delete your account and data;
- **Restrict or object** to processing;
- **Data portability** — receive your data in a machine-readable format;
- **Withdraw consent** where consent is the legal basis.

To exercise any of these, contact **[TODO: privacy contact email]** or delete your account from the app. We respond within 30 days. You also have the right to lodge a complaint with your local data protection authority (in Germany: Berliner Beauftragte für Datenschutz und Informationsfreiheit — www.datenschutz-berlin.de).

## 10. Children

The service is not directed at children. You must be at least **16 years old** to use synctext. We do not knowingly collect data from children under this age; if you believe a child has provided us data, contact us and we will delete it.

## 11. Data minimisation

We collect only the data needed to provide the service described in this policy, and no more. Optional fields (e.g. avatar) are not required to use the service.

## 12. Changes to this policy

We may update this policy from time to time. We will notify you of material changes via an in-app notification and/or by updating the date at the top of this page. Continued use after changes means you accept the updated policy.

## 13. Contact

Questions about this policy: **[TODO: privacy contact email]**
