import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>
        <strong>Last updated:</strong> 2026-09-17
      </p>

      <h2 id="acceptance-of-terms">1. Acceptance of terms</h2>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of synctext
        (the &ldquo;Service&rdquo;), a collaborative real-time text editing
        service. By creating an account or using the Service, you agree to these
        Terms. If you do not agree, do not use the Service.
      </p>

      <h2 id="the-service">2. The Service</h2>
      <p>
        synctext lets users create and collaboratively edit documents in real
        time, comment on them, organize work in groups/organizations and connect
        with friends. We may modify or discontinue features at any time.
      </p>

      <h2 id="eligibility">3. Eligibility</h2>
      <p>
        You must be at least <strong>16 years old</strong> to use the Service.
        By using the Service you represent that you meet this age requirement
        and that your use complies with all applicable laws.
      </p>

      <h2 id="accounts">4. Accounts</h2>
      <ul>
        <li>
          You must provide accurate information (a valid email and username) and
          keep your credentials secure. You are responsible for everything done
          with your account.
        </li>
        <li>
          You may not create multiple accounts to circumvent restrictions,
          impersonate others, or register on behalf of someone else without
          authorization.
        </li>
        <li>
          You can delete your account at any time. Upon deletion your data is
          removed as described in our Privacy Policy. Accounts that are inactive
          for 12 months may be deleted after a prior warning email (see our
          Privacy Policy).
        </li>
        <li>We may suspend or terminate accounts that violate these Terms.</li>
      </ul>

      <h2 id="acceptable-use">5. Acceptable use</h2>
      <p>
        You agree <strong>not</strong> to use the Service to:
      </p>
      <ul>
        <li>Violate any law or regulation.</li>
        <li>
          Infringe the intellectual property or other rights of others (do not
          paste copyrighted text you do not have the right to use).
        </li>
        <li>Distribute malware, spam, or phishing content.</li>
        <li>
          Harass, abuse, defame, or threaten other users, or post content
          inciting hatred or violence.
        </li>
        <li>
          Attempt to gain unauthorized access to the Service, other accounts, or
          our infrastructure (e.g. scanning, probing, credential stuffing).
        </li>
        <li>
          Disrupt or overload the Service, or interfere with other users&apos;
          use of it.
        </li>
        <li>Scrape, sell, or resell data from the Service.</li>
        <li>
          Embed or execute code in documents or comments. The Service stores{" "}
          <strong>text only</strong> and renders it as text. It must never be
          used to deliver or run executable code.
        </li>
      </ul>
      <p>
        We may remove content that violates these rules and, for repeated or
        serious violations, suspend or terminate accounts. Suspensions are
        generally preceded by a warning, except for serious violations (e.g.
        illegal content, attacks on the infrastructure).
      </p>

      <h2 id="content-and-ownership">6. Content and ownership</h2>
      <ul>
        <li>
          <strong>You retain ownership</strong> of the content you create (your
          documents and comments).
        </li>
        <li>
          You grant us a limited, non-exclusive, worldwide license to store,
          process, and transmit your content solely to operate and improve the
          Service (e.g. syncing edits, hosting, backups).
        </li>
        <li>
          <strong>Shared content is licensed to your collaborators.</strong>{" "}
          When you contribute to a shared document, or to a document belonging
          to an organization you are a member of, the other users and
          organizations you share with may continue to use that content as part
          of the document &mdash; including after you stop sharing it or leave
          the organization. You keep ownership. You do not lose the right to use
          your own content.
        </li>
        <li>
          <strong>Sharing is limited to authenticated users.</strong> You can
          share a document with specific users or with an organization you
          belong to. There is no public &ldquo;anyone with a link&rdquo; access:
          documents are visible only to their owner and the users/organization
          members they are shared with.
        </li>
        <li>
          We claim no ownership of your content and do not use it for any
          purpose other than providing the Service.
        </li>
      </ul>

      <h2 id="organizations-and-sharing">7. Organizations and sharing</h2>
      <p>
        Organizations and shared documents are governed by the permissions
        chosen by their owners and administrators. Content you post to a shared
        or organization-visible document (including comments) may be visible to
        and editable by the members you share it with. When you leave an
        organization, your access to its documents is removed, but the content
        you contributed remains part of those documents for their other members.
        Respect the permissions others have set on their documents.
      </p>

      <h2 id="termination-and-suspension">8. Termination and suspension</h2>
      <ul>
        <li>
          <strong>By you</strong>: you may stop using the Service and delete
          your account at any time.
        </li>
        <li>
          <strong>By us</strong>: we may suspend or terminate your account for
          violations of these Terms, illegal activity, or conduct that harms the
          Service or its users. We will generally warn before termination except
          in serious cases, and violations escalate from warning to temporary
          suspension to permanent ban.
        </li>
        <li>
          On termination, your right to use the Service ends. Your data is
          handled per our Privacy Policy.
        </li>
      </ul>

      <h2 id="disclaimer-of-warranties">9. Disclaimer of warranties</h2>
      <p>
        The Service is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
        <strong>&ldquo;as available&rdquo;</strong>, without warranties of any
        kind, express or implied, including merchantability, fitness for a
        particular purpose, and non-infringement. We do not warrant that the
        Service will be uninterrupted, error-free, or that data will never be
        lost.{" "}
        <strong>You are responsible for backing up important content.</strong>
      </p>

      <h2 id="limitation-of-liability">10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for any
        indirect, incidental, special, consequential, or punitive damages, or
        for any loss of data, profits, or goodwill, arising from your use of or
        inability to use the Service.
      </p>

      <h2 id="changes-to-the-service-and-these-terms">
        11. Changes to the Service and these Terms
      </h2>
      <p>
        We may update the Service and these Terms. We will notify you of
        material changes by updating the date above. Continuing to use the
        Service after changes take effect means you accept the updated Terms.
      </p>

      <h2 id="governing-law">12. Governing law</h2>
      <p>
        These Terms are governed by the laws of <strong>Germany</strong>,
        without regard to its conflict-of-law rules. Any disputes shall be
        subject to the exclusive jurisdiction of the competent courts of{" "}
        <strong>Berlin, Germany</strong>.
      </p>
    </>
  );
}
